import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem, type SessionSummaryItem, type CommitmentItem, type OpenThreadItem } from '@dpnr/shared-types'
import { getSessionCrypto, type SessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './helpers'

export interface ConfirmedSignal {
  domain: string
  description: string
  updatedAt: string
}

export interface DecryptedSessionSummary {
  summary: string
  createdAt: string
}

export interface DecryptedOpenThread {
  subject: string
  lifeDomain?: string
  lastTouchedAt: string
}

/** Intelligence Spec §17 — the statuses Companion should still see as "worth returning to"; paused/closed are deliberately excluded. */
const VISIBLE_OPEN_THREAD_STATUSES = new Set(['active', 'waiting_for_life', 'ready_to_review'])

/**
 * Shared read for both `compose-daily-card.ts` and `compose-weekly-recap.ts`
 * — every **confirmed** Twin signal (never candidate/rejected — spec §5
 * Trust rules: only confirmed signals are real personalization input, same
 * rule `library/topic-detail.ts` already follows) and every stored session
 * summary for one user, both already decrypted, most-recent-first. Callers
 * decide how much of each to actually use (Daily Card wants a small recent
 * slice; Weekly Recap wants everything from the last 7 days) — this just
 * gathers and decrypts, it doesn't filter by recency itself.
 *
 * `crypto` is optional: a caller that already resolved a `SessionCrypto` for
 * this same user this invocation (e.g. a batch composer resolving it once
 * per user in its loop) can pass it in to avoid a redundant DEK resolution;
 * any other caller can omit it and one is resolved here.
 */
export async function gatherContinuityContext(
  userId: string,
  crypto?: SessionCrypto
): Promise<{
  confirmedSignals: ConfirmedSignal[]
  sessionSummaries: DecryptedSessionSummary[]
  openThreads: DecryptedOpenThread[]
}> {
  const pk = userPk(userId)
  const resolvedCrypto = crypto ?? (await getSessionCrypto(userId))

  const [signalsResult, summariesResult, openThreadsResult] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'SESSION#' },
      })
    ),
    ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'OPENTHREAD#' },
      })
    ),
  ])

  const confirmedSignals = await Promise.all(
    ((signalsResult.Items ?? []) as TwinSignalItem[])
      .filter((s) => s.status === 'confirmed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(async (s) => ({
        domain: s.domain,
        description: (await resolvedCrypto.decryptField<{ description: string }>(s.content)).description,
        updatedAt: s.updatedAt,
      }))
  )

  // The SESSION# prefix also matches the session envelope itself
  // (Sk.session) and Companion chat turns (Sk.sessionMessage) — only the
  // `#SUMMARY` suffix (Sk.sessionSummary) is a summary item.
  const sessionSummaries = await Promise.all(
    ((summariesResult.Items ?? []) as SessionSummaryItem[])
      .filter((item) => item.sk.endsWith('#SUMMARY'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(async (item) => ({
        summary: (await resolvedCrypto.decryptField<{ summary: string; candidateSignalIds: string[] }>(item.content)).summary,
        createdAt: item.createdAt,
      }))
  )

  const openThreads = await Promise.all(
    ((openThreadsResult.Items ?? []) as OpenThreadItem[])
      .filter((t) => VISIBLE_OPEN_THREAD_STATUSES.has(t.status))
      .sort((a, b) => b.lastTouchedAt.localeCompare(a.lastTouchedAt))
      .map(async (t) => {
        const decrypted = await resolvedCrypto.decryptField<{ subject: string; whyItMatters: string }>(t.content)
        return { subject: decrypted.subject, lifeDomain: t.lifeDomain, lastTouchedAt: t.lastTouchedAt }
      })
  )

  return { confirmedSignals, sessionSummaries, openThreads }
}

export interface DueCommitment {
  description: string
  reviewDate: string
}

/**
 * Open commitments whose `reviewDate` has arrived, earliest-due first —
 * the material for Daily Card's `reminder` kind (compose-daily-card.ts
 * only). Deliberately separate from `gatherContinuityContext` above: that
 * function also backs Companion's per-message `respond` call
 * (companion/message.ts), and a due-commitment lookup has no reason to run
 * on every chat turn — only the once-daily composer needs it.
 *
 * `crypto` is optional, same reasoning as `gatherContinuityContext` above.
 */
export async function getDueCommitments(userId: string, crypto?: SessionCrypto): Promise<DueCommitment[]> {
  const today = new Date().toISOString().slice(0, 10)
  const resolvedCrypto = crypto ?? (await getSessionCrypto(userId))

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'COMMITMENT#' },
    })
  )

  return Promise.all(
    ((result.Items ?? []) as CommitmentItem[])
      .filter((c) => c.status === 'open' && c.reviewDate !== null && c.reviewDate <= today)
      .sort((a, b) => (a.reviewDate as string).localeCompare(b.reviewDate as string))
      .map(async (c) => ({
        description: (await resolvedCrypto.decryptField<{ description: string }>(c.content)).description,
        reviewDate: c.reviewDate as string,
      }))
  )
}
