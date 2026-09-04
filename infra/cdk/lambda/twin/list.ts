import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem, type TwinListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './helpers'

/**
 * GET /v1/twin — every signal the caller has (any status: candidate,
 * confirmed, rejected), most-recently-updated first. `MVP_ARCHITECTURE.md`
 * §4 Slice 1 is "data + confirm/reject, no fixed viz" — this stays a flat
 * data read, no presentation logic. Slice 5 (My Evolution Map) added
 * `lifeDomain`/`archetype` to the response below — real fields already on
 * `TwinSignalItem` since Session 19's classifier, just never read back
 * before; still flat data, not a My-Evolution-Map-specific shape.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
      })
    )

    const signals = await Promise.all(
      ((result.Items ?? []) as TwinSignalItem[])
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(async (item) => ({
          signalId: item.signalId,
          domain: item.domain,
          status: item.status,
          confidence: item.confidence,
          description: (await crypto.decryptField<{ description: string }>(item.content)).description,
          lifeDomain: item.lifeDomain,
          archetype: item.archetype,
          signalType: item.signalType,
          direction: item.direction,
          strength: item.strength,
        }))
    )

    const body: TwinListResponse = { signals }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
