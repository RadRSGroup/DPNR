import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type DecisionItem, type MirrorSessionItem, type TwinSignalItem } from '@dpnr/shared-types'
import { batchDeleteKeys } from '../lib/batch-delete'
import { ddb, TABLE_NAME } from './db'

/**
 * REOPEN (Session 67) — what reopening a completed Room session undoes, so
 * that finishing it again produces one clean set of results rather than a
 * second copy on top of the first:
 *
 * - its UNCONFIRMED Twin signals (`status: 'candidate'`, `sourceSessionId`
 *   = this session) are deleted — completion re-extracts them from the
 *   edited answers. Signals the person already confirmed or rejected are
 *   kept: that's their own judgment, not a model guess, and it stays theirs.
 * - its session summary (`SESSION#<id>#SUMMARY`, read by Continuity) is
 *   deleted — completion writes a fresh one; until then Continuity simply
 *   doesn't see a stale summary of answers that are being changed.
 * - the Room's own record goes back to `active` (each flow's own onReopen).
 *
 * Not touched: credits (Mirror's completion grant is guarded per session by
 * `reflectionCreditGrantedAt`), safety events (audit trail), commitments
 * (Rooms never create CommitmentItems — see rooms/*-steps/commitment.ts).
 */
export async function clearCompletionArtifacts(pk: string, sessionId: string): Promise<void> {
  const candidateKeys: { pk: string; sk: string }[] = []
  let exclusiveStartKey: Record<string, unknown> | undefined
  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        FilterExpression: 'sourceSessionId = :sid AND #status = :candidate',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#', ':sid': sessionId, ':candidate': 'candidate' },
        ProjectionExpression: 'pk, sk',
        ExclusiveStartKey: exclusiveStartKey,
      })
    )
    candidateKeys.push(...((result.Items ?? []) as Pick<TwinSignalItem, 'pk' | 'sk'>[]))
    exclusiveStartKey = result.LastEvaluatedKey
  } while (exclusiveStartKey)

  await batchDeleteKeys(ddb, TABLE_NAME, candidateKeys)
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.sessionSummary(sessionId) } }))
}

export async function reopenDecision(pk: string, sessionId: string): Promise<void> {
  await clearCompletionArtifacts(pk, sessionId)
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionRoom(sessionId) } }))
  const decision = result.Item as DecisionItem | undefined
  if (decision) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...decision, status: 'active', updatedAt: new Date().toISOString() },
      })
    )
  }
}

export async function reopenMirror(pk: string, sessionId: string): Promise<void> {
  await clearCompletionArtifacts(pk, sessionId)
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.mirrorRoom(sessionId) } }))
  const session = result.Item as MirrorSessionItem | undefined
  if (session) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...session, status: 'active', updatedAt: new Date().toISOString() },
      })
    )
  }
}
