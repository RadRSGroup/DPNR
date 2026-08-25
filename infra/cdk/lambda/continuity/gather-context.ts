import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type TwinSignalItem, type SessionSummaryItem, type CommitmentItem } from '@dpnr/shared-types'
import { stubDecryptField } from '../lib/crypto-stub'
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

/**
 * Shared read for both `compose-daily-card.ts` and `compose-weekly-recap.ts`
 * — every **confirmed** Twin signal (never candidate/rejected — spec §5
 * Trust rules: only confirmed signals are real personalization input, same
 * rule `library/topic-detail.ts` already follows) and every stored session
 * summary for one user, both already decrypted, most-recent-first. Callers
 * decide how much of each to actually use (Daily Card wants a small recent
 * slice; Weekly Recap wants everything from the last 7 days) — this just
 * gathers and decrypts, it doesn't filter by recency itself.
 */
export async function gatherContinuityContext(
  userId: string
): Promise<{ confirmedSignals: ConfirmedSignal[]; sessionSummaries: DecryptedSessionSummary[] }> {
  const pk = userPk(userId)

  const [signalsResult, summariesResult] = await Promise.all([
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
  ])

  const confirmedSignals = ((signalsResult.Items ?? []) as TwinSignalItem[])
    .filter((s) => s.status === 'confirmed')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((s) => ({
      domain: s.domain,
      description: stubDecryptField<{ description: string }>(s.content).description,
      updatedAt: s.updatedAt,
    }))

  // The SESSION# prefix also matches the session envelope itself
  // (Sk.session) and Companion chat turns (Sk.sessionMessage) — only the
  // `#SUMMARY` suffix (Sk.sessionSummary) is a summary item.
  const sessionSummaries = ((summariesResult.Items ?? []) as SessionSummaryItem[])
    .filter((item) => item.sk.endsWith('#SUMMARY'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      summary: stubDecryptField<{ summary: string; candidateSignalIds: string[] }>(item.content).summary,
      createdAt: item.createdAt,
    }))

  return { confirmedSignals, sessionSummaries }
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
 */
export async function getDueCommitments(userId: string): Promise<DueCommitment[]> {
  const today = new Date().toISOString().slice(0, 10)

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'COMMITMENT#' },
    })
  )

  return ((result.Items ?? []) as CommitmentItem[])
    .filter((c) => c.status === 'open' && c.reviewDate !== null && c.reviewDate <= today)
    .sort((a, b) => (a.reviewDate as string).localeCompare(b.reviewDate as string))
    .map((c) => ({
      description: stubDecryptField<{ description: string }>(c.content).description,
      reviewDate: c.reviewDate as string,
    }))
}
