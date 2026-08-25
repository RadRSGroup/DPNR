import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem, type AlignmentScoreSnapshotItem } from '@dpnr/shared-types'
import { computeAlignmentScore, fetchAlignmentScoreInputs } from '../lib/alignment-score'
import { ddb, TABLE_NAME } from './helpers'

/**
 * Scheduled once daily (`aws-events.Rule` cron target, api-stack.ts) — NOT
 * an API handler, no API Gateway route. Writes one
 * `ALIGNMENT#SNAPSHOT#<date>` per consented user with enough real data to
 * produce a non-null score (see lib/alignment-score.ts), so "My Evolution"
 * on the Dashboard can chart real history instead of only ever showing
 * today's live-computed value. Same enumeration/error-isolation pattern as
 * `compose-daily-card.ts` — see that file's own doc comment for the real
 * Scan-at-today's-scale caveat, which applies identically here.
 */
export const handler = async (): Promise<void> => {
  let snapshotted = 0
  let skippedNoConsent = 0
  let skippedNoScoreYet = 0
  let failed = 0

  const today = new Date().toISOString().slice(0, 10)

  let exclusiveStartKey: Record<string, unknown> | undefined
  do {
    const scanResult = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'sk = :profileSk',
        ExpressionAttributeValues: { ':profileSk': Sk.profile() },
        ExclusiveStartKey: exclusiveStartKey,
      })
    )
    const profiles = (scanResult.Items ?? []) as UserProfileItem[]

    for (const profile of profiles) {
      if (!profile.consentedAt) {
        skippedNoConsent++
        continue
      }
      try {
        const { commitments, signals } = await fetchAlignmentScoreInputs(ddb, TABLE_NAME, profile.userId)
        const score = computeAlignmentScore(commitments, signals)
        if (score === null) {
          skippedNoScoreYet++
          continue
        }
        const item: AlignmentScoreSnapshotItem = {
          pk: userPk(profile.userId),
          sk: Sk.alignmentScoreSnapshot(today),
          date: today,
          score,
          createdAt: new Date().toISOString(),
        }
        await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
        snapshotted++
      } catch (err) {
        failed++
        console.error('Alignment Score snapshot failed for one user (non-fatal):', err instanceof Error ? err.message : 'unknown error')
      }
    }

    exclusiveStartKey = scanResult.LastEvaluatedKey
  } while (exclusiveStartKey)

  console.log(
    `Alignment Score snapshot done: ${snapshotted} snapshotted, ${skippedNoConsent} skipped (no consent), ${skippedNoScoreYet} skipped (no score yet), ${failed} failed.`
  )
}
