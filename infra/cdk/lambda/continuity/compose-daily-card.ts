import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem, type DailyCardItem } from '@dpnr/shared-types'
import { getSessionCrypto } from '../lib/session-crypto'
import { resolvePromptVersion, promptRef } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { ddb, TABLE_NAME } from './helpers'
import { gatherContinuityContext, getDueCommitments } from './gather-context'

const DUE_COMMITMENTS_LIMIT = 2

const RECENT_SIGNALS_LIMIT = 5
const NONE_YET = '(none yet)'
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * Scheduled once daily (`aws-events.Rule` cron target, api-stack.ts) — NOT
 * an API handler, no API Gateway route. Composes `DAILYCARD#<today>` for
 * every consented user with at least some real material to draw on.
 * `GET /v1/daily-card` (get-daily-card.ts) only ever reads what this wrote;
 * it never composes on demand (MVP_ARCHITECTURE.md §5.7/§6).
 *
 * Enumerates users via a full `Scan` filtered to `sk = 'PROFILE'` — same
 * profile as `library/topics.ts`'s catalog scan: fine at today's real scale
 * (a handful of beta users, confirmed via `PHASE_AUDIT.md`'s live
 * `--select COUNT` checks), but this will NOT scale past a few thousand
 * users without a dedicated user-index GSI or a Step Functions Map
 * fan-out — flagging now rather than silently capping later.
 *
 * One user's failure (a bad Bedrock response, a decrypt error, anything)
 * is caught and logged (generic message only, never raw content) so it
 * can't take down the rest of the batch — same "never fail the whole
 * thing over one user" principle `extractCandidateSignals` already uses.
 */
export const handler = async (): Promise<void> => {
  let composed = 0
  let skippedNoConsent = 0
  let skippedNoMaterial = 0
  let failed = 0

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
        const composedOne = await composeForUser(profile.userId)
        if (composedOne) composed++
        else skippedNoMaterial++
      } catch (err) {
        failed++
        console.error('Daily Card composition failed for one user (non-fatal):', err instanceof Error ? err.message : 'unknown error')
      }
    }

    exclusiveStartKey = scanResult.LastEvaluatedKey
  } while (exclusiveStartKey)

  console.log(
    `Daily Card composition done: ${composed} composed, ${skippedNoConsent} skipped (no consent), ${skippedNoMaterial} skipped (no material), ${failed} failed.`
  )
}

async function composeForUser(userId: string): Promise<boolean> {
  const crypto = await getSessionCrypto(userId)
  const [{ confirmedSignals, sessionSummaries }, dueCommitments] = await Promise.all([
    gatherContinuityContext(userId, crypto),
    getDueCommitments(userId, crypto),
  ])

  const recentSignalsList = confirmedSignals
    .slice(0, RECENT_SIGNALS_LIMIT)
    .map((s) => `- (${s.domain}) ${s.description}`)
    .join('\n')
  const recentSummary = sessionSummaries[0]?.summary
  const dueCommitmentsList = dueCommitments
    .slice(0, DUE_COMMITMENTS_LIMIT)
    .map((c) => `- ${c.description}`)
    .join('\n')

  if (!recentSignalsList && !recentSummary && !dueCommitmentsList) {
    return false // nothing real to draw on — never compose a card from nothing
  }

  const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'daily_card', 'compose')
  const modelResult = await callPromptModel(version, {
    confirmedSignals: recentSignalsList || NONE_YET,
    recentSummary: recentSummary || NONE_YET,
    dueCommitments: dueCommitmentsList || NONE_YET,
  })
  if (typeof modelResult === 'string') {
    throw new Error('daily_card/compose did not return the forced structured output.')
  }
  const { kind, text } = modelResult as { kind: string; text: string }

  const today = new Date().toISOString().slice(0, 10)
  const item: DailyCardItem = {
    pk: userPk(userId),
    sk: Sk.dailyCard(today),
    content: await crypto.encryptField({ text, kind }),
    promptRef: promptRef('daily_card', 'compose', version),
    createdAt: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return true
}
