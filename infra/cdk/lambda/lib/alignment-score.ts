import { QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { userPk, type CommitmentItem, type TwinSignalItem } from '@dpnr/shared-types'

// Alignment Score v1 (Session 19) — how well the person is living out what
// they've told DPNR matters to them. 60% commitment follow-through rate
// (completed vs dropped, among CommitmentItems that have actually been
// resolved) + 40% values clarity (confirmed domain='value' Twin signals,
// capped at 5 confirmed = 100%). First pass, not product-reviewed; revisit
// once real usage data exists to calibrate against. Shared between
// dashboard/handler.ts (today's live value) and
// continuity/snapshot-alignment-score.ts (the daily history behind "My
// Evolution") so the two can never silently drift apart.
const FOLLOW_THROUGH_WEIGHT = 0.6
const VALUES_CLARITY_WEIGHT = 0.4
const CONFIRMED_VALUES_FOR_FULL_CLARITY = 5

// Confidence-gating thresholds (Session 29, ADR 0011) — spec §12's table:
// "Insufficient: <5 meaningful items OR <2 sources OR <14-day span" /
// "Developing: threshold met, confidence <0.65" / "Eligible: confidence
// >=0.65". Adapted to this score's two actual evidence types (resolved
// commitments, confirmed value signals) since neither the spec's exact
// evidence-count/source-diversity/time-span formula nor a validated
// confidence model exists for this index yet — same "first pass" status as
// the score weights above, not empirically calibrated.
const MIN_EVIDENCE_COUNT = 5
const MIN_SOURCE_COUNT = 2
const MIN_TIME_SPAN_DAYS = 14
const ELIGIBLE_CONFIDENCE_THRESHOLD = 0.65

export type AlignmentScoreResult =
  | { state: 'insufficient' }
  | { state: 'developing' }
  | { state: 'eligible'; score: number }

function daysBetween(earlierIso: string, laterIso: string): number {
  return (new Date(laterIso).getTime() - new Date(earlierIso).getTime()) / (1000 * 60 * 60 * 24)
}

export function computeAlignmentScore(commitments: CommitmentItem[], signals: TwinSignalItem[]): AlignmentScoreResult {
  const resolvedCommitments = commitments.filter((c) => c.status !== 'open')
  const confirmedValueSignals = signals.filter((s) => s.domain === 'value' && s.status === 'confirmed')

  const evidenceCount = resolvedCommitments.length + confirmedValueSignals.length
  if (evidenceCount === 0) return { state: 'insufficient' }

  // Source diversity proxy: distinct Twin-signal `source` values, plus
  // "commitment follow-through" itself as one more source type if any
  // resolved commitment exists — a real, if coarse, second evidence
  // channel independent of confirmed-value-signal provenance.
  const sources = new Set<string>(confirmedValueSignals.map((s) => s.source))
  if (resolvedCommitments.length > 0) sources.add('commitment_followthrough')

  const timestamps = [...resolvedCommitments.map((c) => c.createdAt), ...confirmedValueSignals.map((s) => s.createdAt)]
  const earliest = timestamps.reduce((a, b) => (a < b ? a : b))
  const latest = timestamps.reduce((a, b) => (a > b ? a : b))
  const timeSpanDays = daysBetween(earliest, latest)

  if (evidenceCount < MIN_EVIDENCE_COUNT || sources.size < MIN_SOURCE_COUNT || timeSpanDays < MIN_TIME_SPAN_DAYS) {
    return { state: 'insufficient' }
  }

  // Confidence proxy — spec §12's inputs (evidence_count + source_diversity
  // + time_span + recency + explicit_confirmation - contradiction - stale)
  // collapsed into the three of those this score actually has data for.
  const confidence =
    0.5 * Math.min(1, evidenceCount / 10) + 0.3 * Math.min(1, timeSpanDays / 30) + 0.2 * Math.min(1, sources.size / 3)

  if (confidence < ELIGIBLE_CONFIDENCE_THRESHOLD) {
    return { state: 'developing' }
  }

  const completedCommitments = resolvedCommitments.filter((c) => c.status === 'completed')
  const followThroughRate =
    resolvedCommitments.length > 0 ? (completedCommitments.length / resolvedCommitments.length) * 100 : null
  const valuesClarity = Math.min(100, (confirmedValueSignals.length / CONFIRMED_VALUES_FOR_FULL_CLARITY) * 100)

  const score =
    followThroughRate === null
      ? Math.round(valuesClarity)
      : Math.round(followThroughRate * FOLLOW_THROUGH_WEIGHT + valuesClarity * VALUES_CLARITY_WEIGHT)

  return { state: 'eligible', score }
}

export async function fetchAlignmentScoreInputs(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  userId: string
): Promise<{ commitments: CommitmentItem[]; signals: TwinSignalItem[] }> {
  const pk = userPk(userId)
  const [commitmentsResult, signalsResult] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'COMMITMENT#' },
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
      })
    ),
  ])
  return {
    commitments: (commitmentsResult.Items ?? []) as CommitmentItem[],
    signals: (signalsResult.Items ?? []) as TwinSignalItem[],
  }
}
