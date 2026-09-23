import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  userPk,
  type TwinSignalItem,
  type LibraryRecommendationsResponse,
  type ExploreTheme,
  type LifeDomainCategory,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { listActiveTopics } from '../lib/library-catalog'
import { getOnboardingActiveDomains } from '../lib/onboarding-snapshot-context'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const CATALOG_TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string
const APPLICATION_TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Maps a Twin signal's `domain` (always present) to the Library's real
 * `exploreTheme` axis (dynamo/global-tables.ts, redesigned this session per
 * the Content Library Master Architecture v2 — replaces the old
 * `DOMAIN_TO_TAXONOMY_CATEGORY` map, which pointed at the now-retired
 * single-string `taxonomyCategory` field). `domain`, not the
 * optional/Bedrock-classified `lifeDomain`, is the join key: it's the one
 * field guaranteed to exist on every confirmed signal regardless of when
 * it was created (see TwinSignalItemSchema's own comment on `lifeDomain`'s
 * gaps). This mapping is this session's own authored decision, not derived
 * from an existing spec — the two taxonomies were never designed to line
 * up 1:1, so `current_focus`/`direction`/`commitment` all land on CHOOSE
 * since all three concern where someone is headed, matching that theme's
 * own real topics (Decision-Making, Fear vs. Desire in Decisions, Future
 * Self).
 */
const DOMAIN_TO_EXPLORE_THEME: Record<string, ExploreTheme> = {
  pattern: 'PATTERNS',
  trigger: 'FEEL',
  value: 'NEED',
  current_focus: 'CHOOSE',
  direction: 'CHOOSE',
  commitment: 'CHOOSE',
}

/**
 * First-Time Onboarding Slice E (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4) —
 * a new, small, self-authored mapping from the onboarding card sequence's
 * `activeDomains` (`LifeDomainCategorySchema`, reused per that plan's §3) to
 * this endpoint's own `ExploreTheme` axis, same judgment-call authority as
 * `DOMAIN_TO_EXPLORE_THEME` above and Session 24/46's own taxonomy mappings
 * — the two axes were never designed to line up 1:1, so this is a real
 * editorial call, not a derived fact. Grounded in what each theme's actual
 * seeded topics are about (`library-topics-v2.seed.ts`), not guessed cold:
 * `career_purpose`→CHOOSE matches how `direction`/`commitment` already land
 * there above (both are "where someone is headed"); `money_abundance`/
 * `creativity_expression`→CREATE both land on real CREATE topics ("Money
 * Meaning", "Ambition", "Creative Block"); `spirituality`→LIFE matches
 * LIFE's own "Meaning vs. Happiness" topic, the closest fit among the 10
 * fixed themes (none of them is "spirituality" itself).
 */
const LIFE_DOMAIN_TO_EXPLORE_THEME: Record<LifeDomainCategory, ExploreTheme> = {
  self_inner_world: 'ME',
  relationships: 'RELATE',
  career_purpose: 'CHOOSE',
  health_body: 'BODY',
  money_abundance: 'CREATE',
  creativity_expression: 'CREATE',
  spirituality: 'LIFE',
}

/**
 * GET /v1/library/recommendations — a real v1 ranking, replacing the
 * previously-always-empty stub (see git history for the prior handler's
 * own reasoning). Ranks topics by how many of the caller's confirmed Twin
 * signals map to that topic's `taxonomyCategory` via
 * `DOMAIN_TO_TAXONOMY_CATEGORY` above, most-referenced category first.
 *
 * Deliberately does NOT exclude topics the person has "already read" —
 * the plan that specified this feature assumed that concept existed, but
 * no read/view-history tracking exists anywhere in this codebase (checked
 * before writing this). Inventing one would be a much larger feature than
 * this endpoint; recommending an already-read topic is a minor rough edge,
 * not a "don't fabricate" violation, so it's left as a known gap rather
 * than blocking this on unrelated new tracking infrastructure.
 *
 * Degrades to an honest empty list if the caller has zero confirmed signals
 * AND no First-Time Onboarding intake to fall back on (see the
 * `rankedFromOnboarding` fallback below, Slice E) — same "no half-finished
 * implementations" standard the prior stub's own doc comment already
 * established for this endpoint.
 *
 * Intelligence Spec §17 "Do Nothing Is a Valid Recommendation" — when the
 * ranking above comes back empty for a person who nonetheless HAS some real
 * confirmed-signal history, that's a materially different empty state from
 * "brand new, nothing yet": every current confirmed signal is either
 * already covered by what they've read or doesn't map to a live topic —
 * there's genuinely nothing new the catalog can usefully add right now.
 * `noActionReason: 'integration_space'` distinguishes that case explicitly
 * rather than returning the same silent empty list either way. First-pass
 * heuristic — this codebase has no read/view-history tracking (see the
 * "already read" note above) to build a more precise trigger from, so
 * "has confirmed signals but nothing ranked" is what's actually available
 * today; flagged for product review, not treated as final.
 */
const INTEGRATION_SPACE_MESSAGE = 'You may already have enough to take with you for now.'
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const [signalsResult, topics, onboardingActiveDomains] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: APPLICATION_TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
        })
      ),
      listActiveTopics(ddb, CATALOG_TABLE_NAME),
      // First-Time Onboarding Slice E — see themeScores' fallback below.
      // Plaintext-only read, no session ticket required.
      getOnboardingActiveDomains(ddb, APPLICATION_TABLE_NAME, pk),
    ])

    const confirmedSignals = ((signalsResult.Items ?? []) as TwinSignalItem[]).filter(
      (s) => s.status === 'confirmed'
    )

    const themeScores = new Map<ExploreTheme, number>()
    for (const signal of confirmedSignals) {
      const theme = DOMAIN_TO_EXPLORE_THEME[signal.domain]
      if (!theme) continue // every current domain value maps to something, but stay defensive against a future enum addition
      themeScores.set(theme, (themeScores.get(theme) ?? 0) + 1)
    }

    // First-Time Onboarding Slice E: only when confirmed Twin signals gave
    // no real theme score yet (a brand-new account — exactly the case that
    // used to fall straight through to an honest empty list) — seed
    // themeScores from the onboarding card sequence's own activeDomains
    // instead, via LIFE_DOMAIN_TO_EXPLORE_THEME above. A real confirmed
    // signal, once one exists, always wins outright — strictly a fallback,
    // never a blend, same design as pull-card.ts's identical fallback.
    const rankedFromOnboarding = themeScores.size === 0 && onboardingActiveDomains.length > 0
    if (rankedFromOnboarding) {
      for (const domain of onboardingActiveDomains) {
        const theme = LIFE_DOMAIN_TO_EXPLORE_THEME[domain]
        themeScores.set(theme, (themeScores.get(theme) ?? 0) + 1)
      }
    }

    const ranked = topics
      .map((topic) => ({ topic, score: themeScores.get(topic.exploreTheme) ?? 0 }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => ({
        topic: r.topic,
        reason: rankedFromOnboarding
          ? `Related to what you shared when you got started`
          : r.score === 1
            ? `Related to a confirmed ${r.topic.exploreTheme.toLowerCase()} signal`
            : `Related to ${r.score} confirmed ${r.topic.exploreTheme.toLowerCase()} signals`,
      }))

    const body: LibraryRecommendationsResponse =
      ranked.length === 0 && confirmedSignals.length > 0
        ? { recommendations: ranked, noActionReason: 'integration_space', message: INTEGRATION_SPACE_MESSAGE }
        : ranked.length > 0
          ? { recommendations: ranked, basis: rankedFromOnboarding ? 'onboarding' : 'signals' }
          : { recommendations: ranked }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
