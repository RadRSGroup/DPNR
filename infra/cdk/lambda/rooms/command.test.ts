import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

/**
 * Security review 2026-09-14 (DPNR-08) — the actual bug: the pre-check at
 * command.ts's own `existingSession.sessionVersion !== body.
 * expectedSessionVersion` comparison was pure application-code comparison
 * and protected nothing under real concurrency, because it ran strictly
 * BEFORE the final write — two concurrent commands could both read the
 * same state, both pass that check, both consume credits/run a model
 * call, then both reach the final `PutCommand` and silently clobber one
 * another. The fix added a real `ConditionExpression` on that final write
 * (`sessionVersion = :expectedVersion`, or `attribute_not_exists(pk)` for
 * a session's first command) so only one of two racing writes can ever
 * actually commit.
 *
 * This test drives the real handler with two genuinely concurrent first
 * commands for the same brand-new sessionId (`Promise.all`, not
 * sequential awaits) — before the S7 fix, both would have returned 200,
 * silently dropping one; after it, exactly one wins and the other gets a
 * real 409. A stateful in-memory fake DynamoDB table is used (not
 * canned per-call responses) specifically because a real race needs both
 * calls to observe consistent state across their own multiple awaits.
 */

vi.mock('../lib/session-crypto', () => ({
  getSessionCrypto: vi.fn(async () => ({
    encryptField: async (value: unknown) => ({ __fakeEncrypted: true, value }),
    decryptField: async (blob: { value: unknown }) => blob.value,
  })),
}))

const ddbMock = mockClient(DynamoDBDocumentClient)

interface FakeItem {
  [key: string]: unknown
}

function makeFakeTable() {
  const items = new Map<string, FakeItem>()
  const keyOf = (pk: string, sk: string) => `${pk}|${sk}`

  ddbMock.on(GetCommand).callsFake((input) => {
    const key = keyOf(input.Key.pk, input.Key.sk)
    return { Item: items.get(key) }
  })

  ddbMock.on(PutCommand).callsFake((input) => {
    const key = keyOf(input.Item.pk, input.Item.sk)
    const existing = items.get(key)

    if (input.ConditionExpression === 'attribute_not_exists(pk)' && existing) {
      const err = new Error('The conditional request failed')
      err.name = 'ConditionalCheckFailedException'
      throw err
    }
    if (input.ConditionExpression === 'sessionVersion = :expectedVersion') {
      const expected = input.ExpressionAttributeValues?.[':expectedVersion']
      if (!existing || existing.sessionVersion !== expected) {
        const err = new Error('The conditional request failed')
        err.name = 'ConditionalCheckFailedException'
        throw err
      }
    }

    items.set(key, input.Item)
    return {}
  })

  return items
}

function eventFor(userId: string, body: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: userId }, scopes: null } } },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

function newDecisionCommand(idempotencyKey: string) {
  return {
    sessionId: 'session-1',
    flowId: 'DECISION',
    stepId: 'NAME_DECISION',
    action: 'SUBMIT_STEP',
    expectedSessionVersion: 0,
    idempotencyKey,
    // Deliberately under lib/safety.ts's MIN_FREE_TEXT_LENGTH (20 chars)
    // and no HIGH_RISK_PHRASES match — keeps this test on the concurrency
    // path only; classifySafety() has its own dedicated coverage need,
    // not this file's job.
    input: { title: 'New choice' },
  }
}

beforeEach(() => {
  ddbMock.reset()
  vi.clearAllMocks()
})

describe('POST /v1/rooms/decision concurrency (DPNR-08)', () => {
  it('lets exactly one of two truly concurrent first-commands for the same session win; the other gets 409, not a silent clobber', async () => {
    const { handler } = await import('./command')
    const items = makeFakeTable()
    items.set('USER#user-1|PROFILE', {
      consentedAt: '2026-09-22T00:00:00.000Z',
      preferredLanguage: 'en',
      genderIdentity: 'unspecified',
    })

    const [resultA, resultB] = (await Promise.all([
      handler(eventFor('user-1', newDecisionCommand('idem-a')), {} as never, {} as never),
      handler(eventFor('user-1', newDecisionCommand('idem-b')), {} as never, {} as never),
    ])) as { statusCode: number; body: string }[]

    const statuses = [resultA.statusCode, resultB.statusCode].sort()
    expect(statuses).toEqual([200, 409])

    const loser = resultA.statusCode === 409 ? resultA : resultB
    expect(JSON.parse(loser.body).error.code).toBe('session_version_conflict')

    // Exactly one SessionItem exists afterward, at version 1 — not
    // silently overwritten twice, and not left at version 2 either.
    const session = items.get('USER#user-1|SESSION#session-1')
    expect(session?.sessionVersion).toBe(1)
  })

  it('a genuinely sequential retry with a stale expectedSessionVersion is rejected by the same pre-check', async () => {
    const { handler } = await import('./command')
    const items = makeFakeTable()
    items.set('USER#user-1|PROFILE', {
      consentedAt: '2026-09-22T00:00:00.000Z',
      preferredLanguage: 'en',
      genderIdentity: 'unspecified',
    })

    const first = (await handler(eventFor('user-1', newDecisionCommand('idem-a')), {} as never, {} as never)) as {
      statusCode: number
    }
    expect(first.statusCode).toBe(200)

    // Same expectedSessionVersion: 0 again, but now version 1 already
    // exists — a stale client retrying against data it read before the
    // first command committed.
    const second = (await handler(eventFor('user-1', newDecisionCommand('idem-b')), {} as never, {} as never)) as {
      statusCode: number
      body: string
    }
    expect(second.statusCode).toBe(409)
    expect(JSON.parse(second.body).error.code).toBe('session_version_conflict')
  })
})
