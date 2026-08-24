import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, DailyCardFeedbackRequestSchema, type DailyCardFeedbackResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, parseBody, HttpError } from '../lib/http'
import { ddb, TABLE_NAME } from './helpers'

/**
 * POST /v1/daily-card/feedback — records dismiss and/or relevance feedback
 * on today's card (spec §4 Daily Card contract: "Data captured: Open/
 * dismiss/save response; explicit relevance feedback if provided"). Both
 * Dashboard and Companion's Daily Card surfaces call this — dismissing from
 * either hides it on both, since the state lives on the item, not the page.
 * 404s the same way `get-daily-card.ts` does if nothing was composed today.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { dismissed, feedback } = parseBody(event, DailyCardFeedbackRequestSchema)
    if (dismissed === undefined && feedback === undefined) {
      throw new HttpError(400, 'invalid_request', 'Provide at least one of dismissed or feedback.')
    }

    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toISOString()

    const values: Record<string, unknown> = {}
    const sets: string[] = []
    if (dismissed) {
      sets.push('dismissedAt = :dismissedAt')
      values[':dismissedAt'] = now
    }
    if (feedback) {
      sets.push('feedback = :feedback')
      values[':feedback'] = feedback
    }

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: userPk(userId), sk: Sk.dailyCard(today) },
        UpdateExpression: `SET ${sets.join(', ')}`,
        ConditionExpression: 'attribute_exists(pk)',
        ExpressionAttributeValues: values,
      })
    )

    const response: DailyCardFeedbackResponse = { ok: true }
    return jsonResponse(200, response)
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      return errorResponse(new HttpError(404, 'daily_card_not_ready', 'No Daily Card composed yet for today.'))
    }
    return errorResponse(err)
  }
}
