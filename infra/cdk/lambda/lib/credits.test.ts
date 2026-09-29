import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { HttpError } from './http'
import { grantCredits, consumeCredits, claimRefineCharge, REFINE_DEDUPE_WINDOW_SECONDS } from './credits'

/**
 * Security review 2026-09-14 (DPNR-12) — first committed test for the
 * credit ledger primitives. `consumeCredits`'s `ConditionExpression:
 * balance >= :amount` is the only thing standing between a determined
 * caller and unbounded free Bedrock usage once credits are wired into a
 * real billable action — a regression here is a real cost/abuse exposure,
 * not just a UX bug.
 */

const ddbMock = mockClient(DynamoDBDocumentClient)
const TABLE = 'dpnr-application-test'
const PK = 'USER#user-1'

beforeEach(() => {
  ddbMock.reset()
})

describe('consumeCredits', () => {
  it('deducts the amount and appends an auditable ledger entry', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { balance: 7 } })
    ddbMock.on(PutCommand).resolves({})

    const balanceAfter = await consumeCredits(ddbMock as never, TABLE, PK, 3, 'room_refine')

    expect(balanceAfter).toBe(7)
    const update = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(update.ConditionExpression).toBe('attribute_exists(pk) AND balance >= :amount')
    expect(update.ExpressionAttributeValues).toMatchObject({ ':amount': 3 })

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input
    expect(put.Item).toMatchObject({ pk: PK, type: 'consume', amount: -3, balanceAfter: 7, reason: 'room_refine' })
  })

  it('throws a 402 credits_exhausted on insufficient balance and never appends a ledger entry', async () => {
    const conditionalFailure = new Error('The conditional request failed')
    conditionalFailure.name = 'ConditionalCheckFailedException'
    ddbMock.on(UpdateCommand).rejects(conditionalFailure)

    await expect(consumeCredits(ddbMock as never, TABLE, PK, 999, 'room_refine')).rejects.toMatchObject({
      statusCode: 402,
      code: 'credits_exhausted',
    } satisfies Partial<HttpError>)

    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('reads as insufficient for a user with no CREDITS item at all (balance treated as 0)', async () => {
    // The real DynamoDB condition `attribute_exists(pk) AND balance >= :amount`
    // fails a ConditionalCheckFailedException for a nonexistent item — this
    // just confirms consumeCredits maps that same failure to the same 402,
    // not a different code path for "item missing" vs. "balance too low".
    const conditionalFailure = new Error('The conditional request failed')
    conditionalFailure.name = 'ConditionalCheckFailedException'
    ddbMock.on(UpdateCommand).rejects(conditionalFailure)

    await expect(consumeCredits(ddbMock as never, TABLE, PK, 1, 'room_refine')).rejects.toMatchObject({
      statusCode: 402,
      code: 'credits_exhausted',
    } satisfies Partial<HttpError>)
  })

  it('propagates an unexpected DynamoDB error instead of misreporting it as credits_exhausted', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('ProvisionedThroughputExceededException'))

    await expect(consumeCredits(ddbMock as never, TABLE, PK, 1, 'room_refine')).rejects.toThrow(
      'ProvisionedThroughputExceededException'
    )
  })
})

describe('grantCredits', () => {
  it('creates the CREDITS item on a first-ever grant and appends a ledger entry', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { balance: 50 } })
    ddbMock.on(PutCommand).resolves({})

    const balanceAfter = await grantCredits(ddbMock as never, TABLE, PK, 50, 'grant_trial', 'beta_trial_signup')

    expect(balanceAfter).toBe(50)
    const update = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(update.UpdateExpression).toContain('if_not_exists(balance, :zero)')
    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input
    expect(put.Item).toMatchObject({ pk: PK, type: 'grant_trial', amount: 50, balanceAfter: 50 })
  })
})

describe('claimRefineCharge', () => {
  const refineMock = mockClient(DynamoDBDocumentClient)
  beforeEach(() => refineMock.reset())

  it('claims the first charge and conditions on the dedupe window', async () => {
    refineMock.on(PutCommand).resolves({})
    const ddb = DynamoDBDocumentClient.from(new (await import('@aws-sdk/client-dynamodb')).DynamoDBClient({}))
    const ok = await claimRefineCharge(ddb, 't', 'USER#u', 's1', 'VALUES_NEEDS', { optionLabel: 'A' }, 1_000_000_000)
    expect(ok).toBe(true)
    const put = refineMock.commandCalls(PutCommand)[0].args[0].input
    expect(put.Item?.sk).toMatch(/^CREDITS#REFINE#s1#VALUES_NEEDS#[0-9a-f]{32}$/)
    expect(put.ExpressionAttributeValues?.[':cutoff']).toBe(1_000_000 - REFINE_DEDUPE_WINDOW_SECONDS)
  })

  it('returns false for a duplicate inside the window', async () => {
    const e = new Error('dup'); e.name = 'ConditionalCheckFailedException'
    refineMock.on(PutCommand).rejects(e)
    const ddb = DynamoDBDocumentClient.from(new (await import('@aws-sdk/client-dynamodb')).DynamoDBClient({}))
    expect(await claimRefineCharge(ddb, 't', 'USER#u', 's1', 'VALUES_NEEDS', { optionLabel: 'A' })).toBe(false)
  })

  it('hashes different inputs to different markers', async () => {
    refineMock.on(PutCommand).resolves({})
    const ddb = DynamoDBDocumentClient.from(new (await import('@aws-sdk/client-dynamodb')).DynamoDBClient({}))
    await claimRefineCharge(ddb, 't', 'USER#u', 's1', 'VALUES_NEEDS', { optionLabel: 'A' })
    await claimRefineCharge(ddb, 't', 'USER#u', 's1', 'VALUES_NEEDS', { optionLabel: 'B' })
    const [a, b] = refineMock.commandCalls(PutCommand).map((c) => c.args[0].input.Item?.sk)
    expect(a).not.toBe(b)
  })
})
