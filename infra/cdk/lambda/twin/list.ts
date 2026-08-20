import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem, type TwinListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { ddb, TABLE_NAME } from './helpers'

/**
 * GET /v1/twin — every signal the caller has (any status: candidate,
 * confirmed, rejected), most-recently-updated first. `MVP_ARCHITECTURE.md`
 * §4 Slice 1 is "data + confirm/reject, no fixed viz" — this is a flat data
 * read, no My Evolution Map presentation logic belongs here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
      })
    )

    const signals = ((result.Items ?? []) as TwinSignalItem[])
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((item) => ({
        signalId: item.signalId,
        domain: item.domain,
        status: item.status,
        confidence: item.confidence,
        description: stubDecryptField<{ description: string }>(item.content).description,
      }))

    const body: TwinListResponse = { signals }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
