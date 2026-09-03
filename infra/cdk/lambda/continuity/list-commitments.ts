import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type CommitmentItem, type CommitmentsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './helpers'

/**
 * GET /v1/commitments — every commitment the caller has, any status,
 * most-recently-created first. Pure read of already-stored own data, same
 * precedent as twin/list.ts — no consent gate.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'COMMITMENT#' },
      })
    )

    const commitments = await Promise.all(
      ((result.Items ?? []) as CommitmentItem[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(async (item) => ({
          commitmentId: item.commitmentId,
          status: item.status,
          description: (await crypto.decryptField<{ description: string }>(item.content)).description,
          reviewDate: item.reviewDate,
          lifeDomain: item.lifeDomain,
          sourceRoomType: item.sourceRoomType,
          createdAt: item.createdAt,
        }))
    )

    const body: CommitmentsResponse = { commitments }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
