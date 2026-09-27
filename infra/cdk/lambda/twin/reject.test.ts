import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { repeatsRejected, formatRejectedReadings } from '../lib/rejected-readings'

/** "Not quite" follow-up (2026-09-27) and the rejected-reading repeat guard. */

const getSessionCrypto = vi.fn(async () => ({
  encryptField: async (value: unknown) => ({ __enc: value }),
  decryptField: async (blob: { __enc: unknown }) => blob.__enc,
}))
vi.mock('../lib/session-crypto', () => ({ getSessionCrypto: () => getSessionCrypto() }))
vi.mock('./helpers', async () => {
  const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb')
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  return {
    ddb: DynamoDBDocumentClient.from(new DynamoDBClient({})),
    TABLE_NAME: 'table',
    findSignalById: vi.fn(async () => ({ pk: 'USER#u1', sk: 'TWIN#SIGNAL#pattern#s1' })),
  }
})

import { handler } from './reject'

const ddbMock = mockClient(DynamoDBDocumentClient)

function event(body?: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    pathParameters: { id: 's1' },
    requestContext: { authorizer: { jwt: { claims: { sub: 'u1' } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function call(body?: unknown) {
  const res = (await handler(event(body), {} as never, () => undefined)) as { statusCode: number }
  return res.statusCode
}

beforeEach(() => {
  ddbMock.reset()
  getSessionCrypto.mockClear()
  ddbMock.on(UpdateCommand).resolves({})
})

describe('POST /v1/twin/signals/{id}/reject', () => {
  it('a plain reject only flips the status and needs no session ticket', async () => {
    expect(await call()).toBe(200)
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(input.UpdateExpression).toBe('SET #status = :status, updatedAt = :now')
    expect(getSessionCrypto).not.toHaveBeenCalled()
  })

  it('stores the reason, and the correction encrypted', async () => {
    expect(await call({ reason: 'partly', correction: 'It is more about fairness.' })).toBe(200)
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(input.UpdateExpression).toContain('rejectReason = :reason')
    expect(input.ExpressionAttributeValues![':reason']).toBe('partly')
    expect(input.ExpressionAttributeValues![':feedback']).toEqual({ __enc: { correction: 'It is more about fairness.' } })
  })

  it('rejects an unknown reason', async () => {
    expect(await call({ reason: 'nope' })).toBe(400)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })
})

describe('repeatsRejected', () => {
  const rejected = [{ description: 'You tend to say yes to extra work even when you are stretched.' }]
  it('catches a near-verbatim repeat', () => {
    expect(repeatsRejected('You tend to say yes to extra work even when stretched.', rejected)).toBe(true)
  })
  it('lets a different reading through', () => {
    expect(repeatsRejected('Fairness matters a lot to you in how decisions get made.', rejected)).toBe(false)
  })
  it('formats corrections for the prompt', () => {
    expect(formatRejectedReadings([])).toBe('(none)')
    expect(formatRejectedReadings([{ description: 'A', correction: 'B' }])).toBe('- A (they said: "B")')
  })
})
