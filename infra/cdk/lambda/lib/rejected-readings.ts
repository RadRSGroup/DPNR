import { QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { TwinSignalItem } from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'

/** How many recent rejections extraction is reminded of. */
const MAX_REJECTED = 12
/** Word overlap at or above which a new candidate counts as a rejected reading coming back. */
const REPEAT_OVERLAP = 0.6

export interface RejectedReading {
  description: string
  correction?: string
}

/**
 * The person's most recent rejected readings ("Not quite"), decrypted, with
 * the correction they gave if any (founder feedback 2026-09-27: "a rejected
 * interpretation should not repeatedly return as though it were
 * established truth"). Feeds twin/extract_signals and the repeat guard.
 */
export async function loadRejectedReadings(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  crypto: SessionCrypto
): Promise<RejectedReading[]> {
  const items: TwinSignalItem[] = []
  let start: Record<string, unknown> | undefined
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
        ExclusiveStartKey: start,
      })
    )
    items.push(...((res.Items ?? []) as TwinSignalItem[]))
    start = res.LastEvaluatedKey
  } while (start)

  const rejected = items
    .filter((s) => s.status === 'rejected')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_REJECTED)
  return Promise.all(
    rejected.map(async (s) => {
      const { description } = await crypto.decryptField<{ description: string }>(s.content)
      const correction = s.feedback
        ? (await crypto.decryptField<{ correction?: string }>(s.feedback)).correction
        : undefined
      return correction ? { description, correction } : { description }
    })
  )
}

export function formatRejectedReadings(readings: RejectedReading[]): string {
  if (readings.length === 0) return '(none)'
  return readings
    .map((r) => (r.correction ? `- ${r.description} (they said: "${r.correction}")` : `- ${r.description}`))
    .join('\n')
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 4)
  )
}

/**
 * Cheap backstop for the prompt rule: true when a new candidate's wording
 * overlaps a rejected reading heavily (Jaccard over words of 4+ letters).
 * The prompt catches paraphrases; this catches a near-verbatim repeat.
 */
export function repeatsRejected(description: string, rejected: RejectedReading[]): boolean {
  const a = words(description)
  if (a.size === 0) return false
  return rejected.some((r) => {
    const b = words(r.description)
    if (b.size === 0) return false
    let shared = 0
    for (const w of a) if (b.has(w)) shared++
    return shared / (a.size + b.size - shared) >= REPEAT_OVERLAP
  })
}
