import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type MirrorSessionItem, type MirrorsListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './db'
import type { MirrorContent } from './mirror-steps/helpers'

/**
 * GET /v1/rooms/mirrors — a summary list, most-recently-created first.
 * Same ownership model as mirror-full.ts. No sub-items share the
 * `ROOM#MIRROR#` prefix (Mirror Room's data model is one flat item per
 * session, per dynamo/mirror-room.ts's own doc comment), so no filtering
 * by sk shape is needed the way list-decisions.ts needs it.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'ROOM#MIRROR#' },
      })
    )

    const items = (result.Items ?? []) as MirrorSessionItem[]

    const mirrors = await Promise.all(
      items
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(async (item) => {
          const content = await crypto.decryptField<MirrorContent>(item.content)
          return {
            mirrorId: item.mirrorId,
            label: content.lifeDomain ? `Reflection — ${content.lifeDomain}` : 'Reflection',
            status: item.status,
            createdAt: item.createdAt,
          }
        })
    )

    const body: MirrorsListResponse = { mirrors }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
