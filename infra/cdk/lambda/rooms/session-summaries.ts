import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  userPk,
  SESSION_SUMMARIES_MAX_RANGE_DAYS,
  type SessionItem,
  type SessionSummaryItem,
  type SessionSummariesResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './db'

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /v1/rooms/session-summaries — the caller's own Decision/Mirror session
 * summaries in a date range, for the "Summary for my therapist" builder
 * (docs/PROVIDER_SUMMARY_PLAN.md, Slice 1). Ownership is structural: only
 * the caller's own partition is queried. The room type comes from each
 * summary's parent SessionItem (`SESSION#<id>`), read in the same query.
 * Companion sessions have no summaries and are never returned.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { from, to } = parseRange(event.queryStringParameters?.from, event.queryStringParameters?.to)

    // Paginated: Companion chat messages share the SESSION# prefix, so a long
    // history can exceed one 1 MB page and push summaries past the first.
    const items: Record<string, unknown>[] = []
    let startKey: Record<string, unknown> | undefined
    do {
      const page = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'SESSION#' },
          ExclusiveStartKey: startKey,
        })
      )
      items.push(...(page.Items ?? []))
      startKey = page.LastEvaluatedKey
    } while (startKey)

    const roomTypeBySession = new Map<string, SessionItem['roomType']>()
    for (const item of items as unknown as SessionItem[]) {
      if (item.sessionId && item.roomType && item.sk === `SESSION#${item.sessionId}`) {
        roomTypeBySession.set(item.sessionId, item.roomType)
      }
    }

    const inRange = (items as unknown as SessionSummaryItem[]).filter((item) => {
      if (!item.sk.endsWith('#SUMMARY')) return false
      const day = item.createdAt.slice(0, 10)
      return day >= from && day <= to
    })

    // Only resolve the session ticket when there is something to decrypt.
    const crypto = inRange.length > 0 ? await getSessionCrypto(userId, 'active_session') : null

    const sessions = (
      await Promise.all(
        inRange.map(async (item) => {
          const sessionId = item.sk.slice('SESSION#'.length, -'#SUMMARY'.length)
          const roomType = roomTypeBySession.get(sessionId)
          if (roomType !== 'decision' && roomType !== 'mirror') return null
          const { summary } = await crypto!.decryptField<{ summary: string }>(item.content)
          return { sessionId, roomType, summary, createdAt: item.createdAt }
        })
      )
    )
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const body: SessionSummariesResponse = { from, to, sessions }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}

export function parseRange(fromParam: string | undefined, toParam: string | undefined, now = new Date()): { from: string; to: string } {
  for (const v of [fromParam, toParam]) {
    if (v !== undefined && (!DATE_RE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))) {
      throw new HttpError(400, 'validation_error', 'Dates must be YYYY-MM-DD.')
    }
  }
  const to = toParam ?? now.toISOString().slice(0, 10)
  const from = fromParam ?? new Date(Date.parse(`${to}T00:00:00Z`) - 30 * DAY_MS).toISOString().slice(0, 10)
  if (from > to) throw new HttpError(400, 'validation_error', '`from` must not be after `to`.')
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  if (days > SESSION_SUMMARIES_MAX_RANGE_DAYS) {
    throw new HttpError(400, 'validation_error', `The range can be at most ${SESSION_SUMMARIES_MAX_RANGE_DAYS} days.`)
  }
  return { from, to }
}
