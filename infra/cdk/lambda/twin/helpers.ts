import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem } from '@dpnr/shared-types'
import { HttpError } from '../lib/http'

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
export const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * `GET /v1/twin/signals/{id}/confirm|reject` carries only a bare `signalId`
 * in the path (MVP_ARCHITECTURE.md §4's route shape), but `Sk.twinSignal`
 * needs `domain` too to address the item directly. Rather than change the
 * route to a two-segment path or add a GSI, this queries the caller's own
 * (structurally ownership-scoped) partition for every `TWIN#SIGNAL#*` item
 * and finds the one whose `signalId` matches — fine at MVP signal-count
 * scale, and avoids new infrastructure for a lookup this small.
 */
export async function findSignalById(userId: string, signalId: string): Promise<TwinSignalItem> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
    })
  )
  const signal = ((result.Items ?? []) as TwinSignalItem[]).find((s) => s.signalId === signalId)
  if (!signal) {
    throw new HttpError(404, 'signal_not_found', `No signal "${signalId}".`)
  }
  return signal
}
