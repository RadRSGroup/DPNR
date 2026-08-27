import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type CreditsTransactionItem, type CreditsTransactionsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/credits/transactions — the real ledger, most-recent first.
 * grantCredits/consumeCredits (lib/credits.ts) have always written
 * CREDITS#TXN#<ts> items; nothing has ever read them back until now.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'CREDITS#TXN#' },
        ScanIndexForward: false, // sk embeds an ISO timestamp, so this is already most-recent-first
      })
    )

    const transactions = ((result.Items ?? []) as CreditsTransactionItem[]).map((item) => ({
      type: item.type,
      amount: item.amount,
      balanceAfter: item.balanceAfter,
      reason: item.reason,
      createdAt: item.createdAt,
    }))

    const body: CreditsTransactionsResponse = { transactions }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
