import { GetCommand, UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { Sk, VISION_MONTHLY_LIMIT, type VisionQuotaItem } from '@dpnr/shared-types'
import { HttpError } from './http'

/** Calendar month in UTC, `YYYY-MM` — the quota window. */
export function currentQuotaMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

/** Expire a month's counter ~2 months after it starts; it's useless once the month is over. */
function quotaTtl(now = new Date()): number {
  return Math.floor(now.getTime() / 1000) + 62 * 24 * 60 * 60
}

export async function getVisionRemaining(ddb: DynamoDBDocumentClient, tableName: string, pk: string): Promise<number> {
  const result = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.visionQuota(currentQuotaMonth()) } })
  )
  const used = (result.Item as VisionQuotaItem | undefined)?.count ?? 0
  return Math.max(0, VISION_MONTHLY_LIMIT - used)
}

/**
 * Atomically reserves one generation for this month — a single conditional
 * `ADD`, so two concurrent starts can never both slip past the limit.
 * Throws 429 `vision_limit_reached` when the month is used up. Returns the
 * month reserved against (for a later refund) and what's left after it.
 */
export async function reserveVisionGeneration(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<{ month: string; remaining: number }> {
  const month = currentQuotaMonth()
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.visionQuota(month) },
        UpdateExpression: 'ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)',
        ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
        ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': 1, ':limit': VISION_MONTHLY_LIMIT, ':ttl': quotaTtl() },
        ReturnValues: 'UPDATED_NEW',
      })
    )
    const used = Number(result.Attributes?.count ?? VISION_MONTHLY_LIMIT)
    return { month, remaining: Math.max(0, VISION_MONTHLY_LIMIT - used) }
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      throw new HttpError(429, 'vision_limit_reached', `You've used this month's ${VISION_MONTHLY_LIMIT} Visions.`)
    }
    throw err
  }
}

/** Gives a reserved generation back after a failure. Never goes below zero. */
export async function refundVisionGeneration(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  month: string
): Promise<void> {
  await ddb
    .send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.visionQuota(month) },
        UpdateExpression: 'ADD #count :minusOne',
        ConditionExpression: '#count > :zero',
        ExpressionAttributeNames: { '#count': 'count' },
        ExpressionAttributeValues: { ':minusOne': -1, ':zero': 0 },
      })
    )
    .catch((err: unknown) => {
      if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err
    })
}
