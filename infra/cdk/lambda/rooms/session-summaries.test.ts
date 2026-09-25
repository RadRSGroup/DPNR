import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

vi.mock('../lib/session-crypto', () => ({
  getSessionCrypto: vi.fn(async () => ({
    decryptField: async (blob: { plain: unknown }) => blob.plain,
  })),
}))

import { handler, parseRange } from './session-summaries'

const ddbMock = mockClient(DynamoDBDocumentClient)
const USER = 'user-1'

function event(qs?: Record<string, string>) {
  return {
    queryStringParameters: qs,
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function call(qs?: Record<string, string>) {
  const res = (await handler(event(qs), {} as never, () => undefined)) as { statusCode: number; body: string }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}
const summary = (id: string, createdAt: string, text: string) => ({
  pk: `USER#${USER}`,
  sk: `SESSION#${id}#SUMMARY`,
  createdAt,
  content: { plain: { summary: text, candidateSignalIds: [] } },
})
const session = (id: string, roomType: string) => ({ pk: `USER#${USER}`, sk: `SESSION#${id}`, sessionId: id, roomType })

beforeEach(() => ddbMock.reset())

describe('GET /v1/rooms/session-summaries', () => {
  it('returns only Decision/Mirror summaries in range, newest first, across pages', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [session('d1', 'decision'), session('c1', 'companion'), summary('c1', '2026-09-10T10:00:00.000Z', 'chat')],
        LastEvaluatedKey: { pk: 'x', sk: 'y' },
      })
      .resolvesOnce({
        Items: [
          session('m1', 'mirror'),
          summary('d1', '2026-09-05T10:00:00.000Z', 'decided'),
          summary('m1', '2026-09-20T10:00:00.000Z', 'reflected'),
          summary('m1', '2026-07-01T10:00:00.000Z', 'too old'),
        ],
      })
    const { status, body } = await call({ from: '2026-09-01', to: '2026-09-25' })
    expect(status).toBe(200)
    expect(body.sessions.map((s: { summary: string }) => s.summary)).toEqual(['reflected', 'decided'])
    expect(body.sessions[0].roomType).toBe('mirror')
    // queried only the caller's own partition
    for (const c of ddbMock.commandCalls(QueryCommand)) {
      expect(c.args[0].input.ExpressionAttributeValues?.[':pk']).toBe(`USER#${USER}`)
    }
  })

  it('rejects malformed or inverted ranges', async () => {
    expect((await call({ from: '2026/09/01' })).status).toBe(400)
    expect((await call({ from: '2026-09-20', to: '2026-09-01' })).status).toBe(400)
    expect((await call({ from: '2024-01-01', to: '2026-01-01' })).status).toBe(400)
  })
})

describe('parseRange', () => {
  it('defaults to the last 30 days', () => {
    expect(parseRange(undefined, undefined, new Date('2026-09-25T12:00:00Z'))).toEqual({ from: '2026-08-26', to: '2026-09-25' })
  })
})
