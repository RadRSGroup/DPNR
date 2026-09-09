import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type DecisionItem, type DecisionOutcomeItem, type DecisionOptionsOverview, type DecisionsListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
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
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'ROOM#DECISION#' },
      })
    )
    const allItems = result.Items ?? []

    // The query prefix also matches option/emotion/tag/projection/outcome/
    // summary sub-items for each decision (ROOM#DECISION#<id>#OPTION#A etc.)
    // — only the bare ROOM#DECISION#<id> item (no further #-segment) is the
    // DecisionItem itself.
    const items = (allItems as DecisionItem[]).filter(
      (item) => item.sk.split('#').length === 3
    )

    const decisions = await Promise.all(
      items
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(async (item) => ({
          decisionId: item.decisionId,
          title: (await crypto.decryptField<DecisionContent>(item.content)).title,
          status: item.status,
          createdAt: item.createdAt,
        }))
    )

    // "Options Overview" (see DecisionOptionsOverviewSchema's own doc comment
    // for why this isn't the reference's literal 60/40 framing). Exactly one
    // OUTCOME item exists per decision that ever reached FUTURE_PROJECTION —
    // future-projection.ts creates it, commitment.ts only ever updates that
    // same item in place — so no "pick the latest" logic is needed.
    // `chosenOptionLabel` is a plaintext structural field (not inside the
    // encrypted `content` blob), so this needs no decrypt at all.
    const outcomes = (allItems as DecisionOutcomeItem[]).filter((item) => item.sk.includes('#OUTCOME#'))
    const optionsOverview: DecisionOptionsOverview | null =
      outcomes.length === 0
        ? null
        : {
            totalWithLean: outcomes.length,
            leaningTowardChoicePct: Math.round(
              (outcomes.filter((o) => o.chosenOptionLabel !== null).length / outcomes.length) * 100
            ),
          }

    const body: DecisionsListResponse = { decisions, optionsOverview }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
