import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type CreditsBalanceItem, type CreditsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { DEFAULT_LOW_BALANCE_THRESHOLD } from '../lib/credits'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/credits — reads the current ledger head. A user with no CREDITS
 * item yet (shouldn't happen post-signup now that post-confirmation.ts
 * grants a starter balance, but is possible for accounts created before
 * that existed) degrades to 0/exhausted rather than erroring — same
 * fallback dashboard/handler.ts already uses.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.credits() } }))
    const item = result.Item as CreditsBalanceItem | undefined
    const balance = item?.balance ?? 0
    const lowBalanceThreshold = item?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD

    const response: CreditsResponse = {
      balance,
      lowBalanceThreshold,
      isLow: balance <= lowBalanceThreshold,
      isExhausted: balance <= 0,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
