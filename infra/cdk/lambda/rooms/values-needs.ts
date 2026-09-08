import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type DecisionTagItem, type GrowthValuesNeedsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './db'

type TagContent = { label: string }

const MAX_PER_LIST = 5

function topLabels(decrypted: string[]): string[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const raw of decrypted) {
    const key = raw.trim().toLowerCase()
    if (!key) continue
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { label: raw.trim(), count: 1 })
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_PER_LIST)
    .map((c) => c.label)
}

/**
 * GET /v1/rooms/decisions/values-needs — Growth Tracker's "Values & Needs
 * Snapshot". A single `begins_with(sk, 'ROOM#DECISION#')` query already
 * returns every decision-room item across every one of the caller's
 * decisions in one shot (same query `list-decisions.ts` uses for the root
 * items) — this handler instead keeps the `#TAG#` sub-items, decrypts only
 * the ones typed `value`/`need`, and tallies label frequency. Real,
 * cross-session aggregation over exactly what the person typed — no
 * classification, no invented taxonomy.
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

    const tagItems = ((result.Items ?? []) as DecisionTagItem[]).filter((item) => item.sk.includes('#TAG#'))
    const valueItems = tagItems.filter((t) => t.tagType === 'value')
    const needItems = tagItems.filter((t) => t.tagType === 'need')

    const [valueLabels, needLabels] = await Promise.all([
      Promise.all(valueItems.map(async (t) => (await crypto.decryptField<TagContent>(t.content)).label)),
      Promise.all(needItems.map(async (t) => (await crypto.decryptField<TagContent>(t.content)).label)),
    ])

    const body: GrowthValuesNeedsResponse = {
      topValues: topLabels(valueLabels),
      topNeeds: topLabels(needLabels),
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
