import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem, type LibraryRecommendationsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { listActiveTopics } from '../lib/library-catalog'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const CATALOG_TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string
const APPLICATION_TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Maps a Twin signal's `domain` (always present) to the Library catalog's
 * `taxonomyCategory` (a free string authored per-topic, currently 4 values
 * in use — infra/cdk/scripts/library-topics.seed.ts). `domain`, not the
 * optional/Bedrock-classified `lifeDomain`, is the join key: it's the one
 * field guaranteed to exist on every confirmed signal regardless of when
 * it was created (see TwinSignalItemSchema's own comment on `lifeDomain`'s
 * gaps). This mapping is this session's own authored decision, not derived
 * from an existing spec — the two taxonomies were never designed to line
 * up 1:1, so `current_focus`/`direction`/`commitment` all land on
 * "Direction & Creation" since all three concern where someone is headed.
 */
const DOMAIN_TO_TAXONOMY_CATEGORY: Record<string, string> = {
  pattern: 'Patterns & Beliefs',
  trigger: 'Inner World',
  value: 'Values & Needs',
  current_focus: 'Direction & Creation',
  direction: 'Direction & Creation',
  commitment: 'Direction & Creation',
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
 * Degrades to an honest empty list if the caller has zero confirmed
 * signals — same "no half-finished implementations" standard the prior
 * stub's own doc comment already established for this endpoint.
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

    const [signalsResult, topics] = await Promise.all([
      ddb.send(
        new QueryCommand({
          TableName: APPLICATION_TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
        })
      ),
      listActiveTopics(ddb, CATALOG_TABLE_NAME),
    ])

    const confirmedSignals = ((signalsResult.Items ?? []) as TwinSignalItem[]).filter(
      (s) => s.status === 'confirmed'
    )

    const categoryScores = new Map<string, number>()
    for (const signal of confirmedSignals) {
      const category = DOMAIN_TO_TAXONOMY_CATEGORY[signal.domain]
      if (!category) continue // every current domain value maps to something, but stay defensive against a future enum addition
      categoryScores.set(category, (categoryScores.get(category) ?? 0) + 1)
    }

    const ranked = topics
      .map((topic) => ({ topic, score: categoryScores.get(topic.taxonomyCategory) ?? 0 }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((r) => ({
        topic: r.topic,
        reason:
          r.score === 1
            ? `Related to a confirmed ${r.topic.taxonomyCategory.toLowerCase()} signal`
            : `Related to ${r.score} confirmed ${r.topic.taxonomyCategory.toLowerCase()} signals`,
      }))

    const body: LibraryRecommendationsResponse =
      ranked.length === 0 && confirmedSignals.length > 0
        ? { recommendations: ranked, noActionReason: 'integration_space', message: INTEGRATION_SPACE_MESSAGE }
        : { recommendations: ranked }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
