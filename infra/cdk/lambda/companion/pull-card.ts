import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  userPk,
  type GuidanceCardItem,
  type GuidanceCardTopic,
  type GuidanceCardLifeDomain,
  type CompanionDirective,
  type PullCardResponse,
  type TwinSignalItem,
  type TwinSignalDomain,
  type LifeDomainCategory,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const CATALOG_TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string
const APPLICATION_TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Maps a confirmed Twin signal's `domain` to Pull a Card's own `topic` axis
 * — same join-key reasoning as `library/recommendations.ts`'s
 * `DOMAIN_TO_EXPLORE_THEME` (`domain` is the one field guaranteed present on
 * every confirmed signal). `current_focus`/`direction`/`commitment` all land
 * on NEXT for the identical reason that map gives for landing all three on
 * one Library theme: they all concern where someone is headed, and NEXT
 * ("Decisions, priorities, goals, momentum") is this bank's own chapter for
 * exactly that.
 */
const DOMAIN_TO_CARD_TOPIC: Record<TwinSignalDomain, GuidanceCardTopic> = {
  pattern: 'PATTERNS',
  trigger: 'FEEL',
  value: 'NEEDS',
  current_focus: 'NEXT',
  direction: 'NEXT',
  commitment: 'NEXT',
}

/**
 * Maps a confirmed Twin signal's optional `lifeDomain` (`LifeDomainCategorySchema`,
 * dynamo/twin.ts — the 7-value Growth Tracker/Dashboard taxonomy) to Pull a
 * Card's own 9-value `lifeDomain` axis. The two taxonomies were authored from
 * different source docs at different times and don't line up 1:1 (same
 * situation as Library's `exploreTheme`, see global-tables.ts's own comment)
 * — this is a best-effort join for card selection, not a reconciliation of
 * the two taxonomies. `creativity_expression` has no clean single match;
 * mapped to 'Personal Growth' as the closer of the two plausible options
 * ('Personal Growth' vs. a nonexistent "Creativity" domain in this bank).
 */
const LIFE_DOMAIN_TO_CARD_DOMAIN: Record<LifeDomainCategory, GuidanceCardLifeDomain> = {
  self_inner_world: 'Personal Growth',
  relationships: 'Relationships',
  career_purpose: 'Work-Career',
  health_body: 'Health',
  money_abundance: 'Finance',
  creativity_expression: 'Personal Growth',
  spirituality: 'Spirituality',
}

/**
 * Resolves a card's `suggestedRoute` into something the client can actually
 * navigate to, reusing `CompanionDirectiveSchema` rather than a parallel
 * contract. `stay_on_card`/`main_chat` need no navigation (the card already
 * lives in Companion); `journal` has no real destination anywhere in this
 * codebase yet (flagged on the enum itself, `global-tables.ts`) — both
 * resolve to `null`, the same honest "nothing to do here yet" signal.
 */
function resolveDirective(route: GuidanceCardItem['suggestedRoute']): CompanionDirective | null {
  switch (route) {
    case 'mirror_room':
      return { kind: 'open_room', roomType: 'mirror' }
    case 'decision_room':
      return { kind: 'open_room', roomType: 'decision' }
    case 'stay_on_card':
    case 'main_chat':
    case 'journal':
      return null
  }
}

/**
 * POST /v1/companion/pull-card — Companion's "Pull a Card," a genuinely
 * different mechanic from the scheduled once-daily Daily Card
 * (compose-daily-card.ts): an on-demand pull from a stored, reusable card
 * library. Scoped to Companion only per the user's own direct confirmation
 * — Dashboard/Decision Room/Mirror Room's Daily Card widget is untouched.
 *
 * **Context-aware selection** (implementation brief, source doc p.2 — "select
 * a card based on context when context is available, rather than relying
 * only on random rotation"). The only context signals already tracked
 * anywhere in this codebase are confirmed Twin signals' `domain` and
 * optional `lifeDomain` (same data `library/recommendations.ts` already
 * reads) — the source doc also names mood, check-ins, journaling, and
 * "current platform activity" as relevant signals, but none of those have
 * any tracking infrastructure in this codebase today (checked before writing
 * this), so building against them would mean inventing new state, not using
 * context that "is available" as the brief specifically qualifies. Cards
 * whose `topic`/`lifeDomain` match the account's own most-referenced
 * confirmed-signal topic/domain are favored 70% of the time a match exists;
 * the other 30%, and always when there is no match (including every
 * brand-new account with zero confirmed signals), the pull is a plain
 * uniform random pick across the whole active library — preserving the
 * source doc's own "not every card should feel therapeutic... depth should
 * feel earned, not imposed" principle instead of always steering toward the
 * heaviest-weighted theme, and preserving today's exact no-signals behavior
 * as an honest fallback rather than a broken empty state.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const [cardsResult, signalsResult] = await Promise.all([
      ddb.send(
        new ScanCommand({
          TableName: CATALOG_TABLE_NAME,
          FilterExpression: 'sk = :cfg AND active = :true',
          ExpressionAttributeValues: { ':cfg': 'CONFIG', ':true': true },
        })
      ),
      ddb.send(
        new QueryCommand({
          TableName: APPLICATION_TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
        })
      ),
    ])

    const cards = (cardsResult.Items ?? []) as GuidanceCardItem[]
    if (cards.length === 0) {
      throw new HttpError(503, 'no_cards_available', 'The card library is empty.')
    }

    const confirmedSignals = ((signalsResult.Items ?? []) as TwinSignalItem[]).filter(
      (s) => s.status === 'confirmed'
    )

    const topicScores = new Map<GuidanceCardTopic, number>()
    const domainScores = new Map<GuidanceCardLifeDomain, number>()
    for (const signal of confirmedSignals) {
      const topic = DOMAIN_TO_CARD_TOPIC[signal.domain]
      topicScores.set(topic, (topicScores.get(topic) ?? 0) + 1)
      if (signal.lifeDomain) {
        const domain = LIFE_DOMAIN_TO_CARD_DOMAIN[signal.lifeDomain]
        domainScores.set(domain, (domainScores.get(domain) ?? 0) + 1)
      }
    }

    const topTopic = [...topicScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const topDomain = [...domainScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    const matchedPool = (topTopic || topDomain)
      ? cards.filter((c) => c.topic === topTopic || (topDomain && c.lifeDomain === topDomain))
      : []

    const pool = matchedPool.length > 0 && Math.random() < 0.7 ? matchedPool : cards
    const card = pool[Math.floor(Math.random() * pool.length)]

    const body: PullCardResponse = {
      cardId: card.pk.replace('GUIDANCE_CARD#', ''),
      text: card.text,
      imageRef: card.imageRef,
      topic: card.topic,
      lifeDomain: card.lifeDomain,
      core: card.core,
      depth: card.depth,
      mode: card.mode,
      state: card.state,
      suggestedRoute: card.suggestedRoute,
      directive: resolveDirective(card.suggestedRoute),
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
