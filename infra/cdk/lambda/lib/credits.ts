import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type CreditsTransactionItem } from '@dpnr/shared-types'
import { HttpError } from './http'

/** Used whenever a CREDITS item doesn't exist yet — same default `dashboard/handler.ts` degrades to. */
export const DEFAULT_LOW_BALANCE_THRESHOLD = 5

export type CreditsGrantType = 'grant_trial' | 'grant_purchase' | 'refund'

/**
 * Grants credits (creating the CREDITS item on a user's first-ever grant)
 * and appends an auditable CREDITS#TXN#<ts> ledger entry (MVP_ARCHITECTURE.md
 * §5.6). Always succeeds — only `consumeCredits` below is conditional on
 * balance.
 *
 * Not a single atomic transaction: the balance UpdateCommand and the ledger
 * PutCommand are two separate writes. A crash between them would leave a
 * correct balance with a missing audit entry, never an incorrect balance —
 * acceptable for MVP scale (same risk-tolerance precedent as the documented
 * "known, acceptable race" in companion/message.ts); revisit with
 * TransactWriteItems if real concurrent-grant volume ever makes the audit
 * gap matter.
 */
export async function grantCredits(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  amount: number,
  type: CreditsGrantType,
  reason: string,
  relatedPlanId?: string
): Promise<number> {
  const now = new Date().toISOString()
  const result = await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk, sk: Sk.credits() },
      UpdateExpression:
        'SET balance = if_not_exists(balance, :zero) + :amount, lowBalanceThreshold = if_not_exists(lowBalanceThreshold, :defaultThreshold), updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':amount': amount,
        ':defaultThreshold': DEFAULT_LOW_BALANCE_THRESHOLD,
        ':now': now,
      },
      ReturnValues: 'UPDATED_NEW',
    })
  )
  const balanceAfter = result.Attributes?.balance as number

  const txn: CreditsTransactionItem = {
    pk,
    sk: Sk.creditsTxn(now),
    type,
    amount,
    balanceAfter,
    reason,
    ...(relatedPlanId ? { relatedPlanId } : {}),
    createdAt: now,
  }
  await ddb.send(new PutCommand({ TableName: tableName, Item: txn }))

  return balanceAfter
}

/**
 * Atomic conditional deduction — the primitive per-action credit billing
 * needs (MVP_ARCHITECTURE.md §5.6's `ConditionExpression: balance >= cost`
 * pattern). Throws HttpError(402, 'credits_exhausted') on insufficient
 * balance (including a user with no CREDITS item at all, which reads as 0).
 *
 * Deliberately NOT called from any Room/Companion/Library handler yet —
 * what counts as a "billable action" is an open product decision (see
 * docs/AGENT_LOG.md's "Prompt for next agent" item 2) that must be
 * confirmed with the user before this gets wired into rooms/command.ts,
 * companion/message.ts, or library/topic-detail.ts.
 */
export async function consumeCredits(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  amount: number,
  reason: string
): Promise<number> {
  const now = new Date().toISOString()
  let balanceAfter: number
  try {
    const result = await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.credits() },
        UpdateExpression: 'SET balance = balance - :amount, updatedAt = :now',
        ConditionExpression: 'attribute_exists(pk) AND balance >= :amount',
        ExpressionAttributeValues: { ':amount': amount, ':now': now },
        ReturnValues: 'UPDATED_NEW',
      })
    )
    balanceAfter = result.Attributes?.balance as number
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw new HttpError(402, 'credits_exhausted', 'Not enough credits for this action.')
    }
    throw err
  }

  const txn: CreditsTransactionItem = {
    pk,
    sk: Sk.creditsTxn(now),
    type: 'consume',
    amount: -amount,
    balanceAfter,
    reason,
    createdAt: now,
  }
  await ddb.send(new PutCommand({ TableName: tableName, Item: txn }))

  return balanceAfter
}
