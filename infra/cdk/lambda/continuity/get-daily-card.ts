import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type DailyCardItem, type DailyCardResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { ddb, TABLE_NAME } from './helpers'

/**
 * GET /v1/daily-card — pure cache hit over whatever `compose-daily-card.ts`
 * (the scheduled Lambda) already wrote for today; never composes on demand
 * (MVP_ARCHITECTURE.md §5.7/§6). 404s honestly when nothing's been composed
 * yet for today — this can legitimately happen for a brand-new user before
 * the next scheduled run, or any user the composer skipped for having no
 * real material yet. Read-only over the caller's own data, no consent gate
 * (same precedent as `dashboard/handler.ts`/`twin/list.ts`).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const today = new Date().toISOString().slice(0, 10)

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.dailyCard(today) } })
    )
    const item = result.Item as DailyCardItem | undefined
    if (!item) {
      throw new HttpError(404, 'daily_card_not_ready', 'No Daily Card composed yet for today.')
    }

    const { text, kind } = stubDecryptField<{ text: string; kind: DailyCardResponse['kind'] }>(item.content)
    const body: DailyCardResponse = {
      date: today,
      kind,
      text,
      dismissedAt: item.dismissedAt ?? null,
      feedback: item.feedback ?? null,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
