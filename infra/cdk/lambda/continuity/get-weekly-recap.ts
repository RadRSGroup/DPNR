import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type WeeklyRecapItem, type WeeklyRecapResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { isoWeekString } from '../lib/iso-week'
import { ddb, TABLE_NAME } from './helpers'

/**
 * GET /v1/weekly-recap — pure cache hit over whatever
 * `compose-weekly-recap.ts` already wrote for the current ISO week; never
 * composes on demand. Same 404-when-not-ready and no-consent-gate
 * reasoning as `get-daily-card.ts`.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const week = isoWeekString(new Date())

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.weeklyRecap(week) } })
    )
    const item = result.Item as WeeklyRecapItem | undefined
    if (!item) {
      throw new HttpError(404, 'weekly_recap_not_ready', 'No Weekly Recap composed yet for this week.')
    }

    const decrypted = stubDecryptField<Omit<WeeklyRecapResponse, 'week'>>(item.content)
    const body: WeeklyRecapResponse = { week, ...decrypted }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
