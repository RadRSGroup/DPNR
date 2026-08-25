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

export function computeAlignmentScore(commitments: CommitmentItem[], signals: TwinSignalItem[]): number | null {
  const resolvedCommitments = commitments.filter((c) => c.status !== 'open')
  const completedCommitments = resolvedCommitments.filter((c) => c.status === 'completed')
  const followThroughRate =
    resolvedCommitments.length > 0 ? (completedCommitments.length / resolvedCommitments.length) * 100 : null

  const confirmedValueSignals = signals.filter((s) => s.domain === 'value' && s.status === 'confirmed')
  const valuesClarity = Math.min(100, (confirmedValueSignals.length / CONFIRMED_VALUES_FOR_FULL_CLARITY) * 100)

  if (followThroughRate === null && valuesClarity === 0) return null
  if (followThroughRate === null) return Math.round(valuesClarity)
  return Math.round(followThroughRate * FOLLOW_THROUGH_WEIGHT + valuesClarity * VALUES_CLARITY_WEIGHT)
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
