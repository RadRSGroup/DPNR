import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem, type WeeklyRecapItem } from '@dpnr/shared-types'
import { stubEncryptField } from '../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { isoWeekString } from '../lib/iso-week'
import { ddb, TABLE_NAME } from './helpers'
import { gatherContinuityContext } from './gather-context'

const NONE_THIS_WEEK = '(none this week)'
const LOOKBACK_DAYS = 7
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * Scheduled once weekly (`aws-events.Rule` cron target, api-stack.ts) — same
 * shape as `compose-daily-card.ts`, see that file's doc comment for the
 * shared design notes (user enumeration via `Scan`, consent gate, per-user
 * error isolation, scale caveat). The one real difference: this filters
 * `gatherContinuityContext`'s all-time results down to the last 7 days —
 * a Weekly Recap covering all-time history would just restate the Daily
 * Card's material forever, not recap *this* week.
 */
export const handler = async (): Promise<void> => {
  let composed = 0
  let skippedNoConsent = 0
  let skippedNoMaterial = 0
  let failed = 0

  const weekAgoIso = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

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
        const composedOne = await composeForUser(profile.userId, weekAgoIso)
        if (composedOne) composed++
        else skippedNoMaterial++
      } catch (err) {
        failed++
        console.error('Weekly Recap composition failed for one user (non-fatal):', err instanceof Error ? err.message : 'unknown error')
      }
    }

    exclusiveStartKey = scanResult.LastEvaluatedKey
  } while (exclusiveStartKey)

  console.log(
    `Weekly Recap composition done: ${composed} composed, ${skippedNoConsent} skipped (no consent), ${skippedNoMaterial} skipped (no material), ${failed} failed.`
  )
}

async function composeForUser(userId: string, weekAgoIso: string): Promise<boolean> {
  const { confirmedSignals, sessionSummaries } = await gatherContinuityContext(userId)

  const weekSignalsList = confirmedSignals
    .filter((s) => s.updatedAt >= weekAgoIso)
    .map((s) => `- (${s.domain}) ${s.description}`)
    .join('\n')
  const weekSummariesList = sessionSummaries
    .filter((s) => s.createdAt >= weekAgoIso)
    .map((s) => `- ${s.summary}`)
    .join('\n')

  if (!weekSignalsList && !weekSummariesList) {
    return false // nothing from this week to draw on — never compose a recap from nothing
  }

  const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'weekly_recap', 'compose')
  const modelResult = await callPromptModel(version, {
    weekSignals: weekSignalsList || NONE_THIS_WEEK,
    weekSummaries: weekSummariesList || NONE_THIS_WEEK,
  })
  if (typeof modelResult === 'string') {
    throw new Error('weekly_recap/compose did not return the forced structured output.')
  }
  const { stoodOut, shifted, remainsActive, suggestion } = modelResult as {
    stoodOut: string
    shifted: string
    remainsActive: string
    suggestion: string
  }

  const item: WeeklyRecapItem = {
    pk: userPk(userId),
    sk: Sk.weeklyRecap(isoWeekString(new Date())),
    content: stubEncryptField({ stoodOut, shifted, remainsActive, suggestion }),
    promptRef: promptRef('weekly_recap', 'compose', version),
    createdAt: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return true
}
