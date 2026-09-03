import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  type RoadmapItem,
  type RoadmapProposalItem,
  type CreditsBalanceItem,
  type DailyCardItem,
  type DailyCardResponse,
  type CommitmentItem,
  type TwinSignalItem,
  type AlignmentScoreSnapshotItem,
  type DashboardResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { computeAlignmentScore } from '../lib/alignment-score'
import { aggregateLifeDomains, aggregateArchetypes } from '../lib/signal-aggregates'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

// Fallback only — every real user gets a CREDITS item from the starter-trial
// grant (auth/post-confirmation.ts). Used so a user somehow without one yet
// reads as "0, low" rather than crashing.
const DEFAULT_LOW_BALANCE_THRESHOLD = 5

const ALIGNMENT_HISTORY_WINDOW_DAYS = 30

type RoadmapContent = {
  currentFocus: string
  theme: string
  direction: string
  suggestedSpaces: string[]
}

type RoadmapProposalContent = RoadmapContent & { rationale: string }

/**
 * GET /v1/dashboard — aggregate read (MVP_ARCHITECTURE.md §4). Read-only
 * over the caller's own data; no consent gate (see lib/consent.ts's doc
 * comment on why reads are excluded).
 *
 * Ownership is structural, not a separate runtime check: every key below
 * is built from `userPk(requireUserId(event))` — the caller's own JWT
 * `sub` — never a client-supplied id, so there is no cross-user access
 * path to guard against here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const crypto = await getSessionCrypto(userId)
    const today = new Date().toISOString().slice(0, 10)
    const historyStart = new Date(Date.now() - ALIGNMENT_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    const [
      roadmapResult,
      roadmapProposalResult,
      creditsResult,
      dailyCardResult,
      commitmentsResult,
      twinSignalsResult,
      alignmentHistoryResult,
    ] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmap() } })),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmapProposal() } })),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.credits() } })),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.dailyCard(today) } })),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'COMMITMENT#' },
        })
      ),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
        })
      ),
      ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND sk BETWEEN :from AND :to',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':from': Sk.alignmentScoreSnapshot(historyStart),
            ':to': Sk.alignmentScoreSnapshot(today),
          },
        })
      ),
    ])

    const roadmapItem = roadmapResult.Item as RoadmapItem | undefined
    const roadmap = roadmapItem ? await crypto.decryptField<RoadmapContent>(roadmapItem.content) : null

    const roadmapProposalItem = roadmapProposalResult.Item as RoadmapProposalItem | undefined
    const roadmapProposal = roadmapProposalItem
      ? await crypto.decryptField<RoadmapProposalContent>(roadmapProposalItem.content)
      : null

    const creditsItem = creditsResult.Item as CreditsBalanceItem | undefined
    const creditsBalance = creditsItem?.balance ?? 0
    const lowBalanceThreshold = creditsItem?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
    const creditsLow = creditsBalance <= lowBalanceThreshold

    const dailyCardItem = dailyCardResult.Item as DailyCardItem | undefined
    const allCommitments = (commitmentsResult.Items ?? []) as CommitmentItem[]
    const openCommitments = allCommitments
      .filter((c) => c.status === 'open')
      .sort((a, b) => (a.reviewDate ?? '9999-99-99').localeCompare(b.reviewDate ?? '9999-99-99'))

    const twinSignals = (twinSignalsResult.Items ?? []) as TwinSignalItem[]
    const alignmentScoreResult = computeAlignmentScore(allCommitments, twinSignals)
    const alignmentScore = alignmentScoreResult.state === 'eligible' ? alignmentScoreResult.score : null
    const alignmentScoreState = alignmentScoreResult.state

    const alignmentHistory = ((alignmentHistoryResult.Items ?? []) as AlignmentScoreSnapshotItem[])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((snap) => ({ date: snap.date, score: snap.score }))

    const lifeDomains = aggregateLifeDomains(twinSignals)
    const archetypes = aggregateArchetypes(twinSignals)

    // Growth Tracker (Slice 4): confirmed signals created this calendar
    // month (UTC), same `today`/window convention as alignmentHistory above.
    const monthStart = `${today.slice(0, 7)}-01`
    const confirmedThisMonth = twinSignals.filter((s) => s.status === 'confirmed' && s.createdAt.slice(0, 10) >= monthStart)
    const insightsGained = confirmedThisMonth.length
    const patternsShifting = confirmedThisMonth.filter((s) => s.domain === 'pattern').length

    // Priority order per spec §2 Golden Path B step 3 ("Daily Card, relevant
    // continuation, upcoming commitment, Roadmap cue... only when useful"):
    // today's Daily Card first (freshest, deliberately composed for today),
    // then the soonest-due open commitment, then a roadmap-suggested space
    // as the least specific fallback. "continuation" (a synthesized
    // welcome-back summary) isn't produced here — that's Companion's own
    // proactive-opening concern, not this aggregate read's, and there's no
    // such synthesis built yet (docs/PHASE_AUDIT.md §4.6).
    const continuityCue = dailyCardItem
      ? {
          kind: 'daily_card' as const,
          text: (await crypto.decryptField<{ text: string; kind: DailyCardResponse['kind'] }>(dailyCardItem.content))
            .text,
        }
      : openCommitments[0]
        ? {
            kind: 'commitment' as const,
            text: (await crypto.decryptField<{ description: string }>(openCommitments[0].content)).description,
          }
        : roadmap && roadmap.suggestedSpaces.length > 0
          ? { kind: 'recommended_space' as const, text: `Consider exploring: ${roadmap.suggestedSpaces[0]}` }
          : null

    const body: DashboardResponse = {
      roadmap,
      roadmapProposal,
      continuityCue,
      creditsBalance,
      creditsLow,
      alignmentScore,
      alignmentScoreState,
      alignmentHistory,
      lifeDomains,
      archetypes,
      insightsGained,
      patternsShifting,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
