import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type OpenThreadItem, type OpenThreadsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/open-threads — every non-closed thread (Intelligence Spec §17),
 * most recently touched first. `paused` threads ARE included here (the
 * person can still see and act on them) — only `closed` is excluded, unlike
 * `gatherContinuityContext`'s narrower Companion-facing set which also
 * excludes `paused` (a paused thread shouldn't surface unprompted in chat,
 * but the person should still be able to find and resume it themselves).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'OPENTHREAD#' },
      })
    )

    const threads = await Promise.all(
      ((result.Items ?? []) as OpenThreadItem[])
        .filter((t) => t.status !== 'closed')
        .sort((a, b) => b.lastTouchedAt.localeCompare(a.lastTouchedAt))
        .map(async (item) => {
          const decrypted = await crypto.decryptField<{ subject: string; whyItMatters: string }>(item.content)
          return {
            threadId: item.threadId,
            status: item.status,
            subject: decrypted.subject,
            whyItMatters: decrypted.whyItMatters,
            lifeDomain: item.lifeDomain,
            lastTouchedAt: item.lastTouchedAt,
            userOwned: item.userOwned,
          }
        })
    )

    const body: OpenThreadsResponse = { threads }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
