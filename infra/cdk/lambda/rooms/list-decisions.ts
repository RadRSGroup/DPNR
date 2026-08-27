import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type DecisionItem, type DecisionsListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { ddb, TABLE_NAME } from './db'

type DecisionContent = { title: string; subtitle: string | null; narrative: string }

/**
 * GET /v1/rooms/decisions — a summary list, most-recently-created first.
 * Same ownership model as decision-full.ts (partition-scoped query, no
 * client-controlled filter). Fills the gap flagged since Session 12 part 3
 * ("dropping the decision-history list is a flagged, reversible content
 * gap... restore it for real once such an endpoint exists").
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'ROOM#DECISION#' },
      })
    )

    // The query prefix also matches option/emotion/tag/projection/outcome/
    // summary sub-items for each decision (ROOM#DECISION#<id>#OPTION#A etc.)
    // — only the bare ROOM#DECISION#<id> item (no further #-segment) is the
    // DecisionItem itself.
    const items = ((result.Items ?? []) as DecisionItem[]).filter(
      (item) => item.sk.split('#').length === 3
    )

    const decisions = items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        decisionId: item.decisionId,
        title: stubDecryptField<DecisionContent>(item.content).title,
        status: item.status,
        createdAt: item.createdAt,
      }))

    const body: DecisionsListResponse = { decisions }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
