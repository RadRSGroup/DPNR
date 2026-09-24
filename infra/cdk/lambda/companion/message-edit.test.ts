import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

/**
 * Edit & resend (Session 67): the edited message and everything after it
 * are replaced — but only once a new reply exists, so a failed edit (e.g.
 * out of credits) never loses the original thread.
 */

vi.mock('../lib/session-crypto', () => ({
  getSessionCrypto: vi.fn(async () => ({
    encryptField: async (value: unknown) => ({ __enc: value }),
    decryptField: async (blob: { __enc: unknown }) => blob.__enc,
  })),
}))
vi.mock('../lib/consent', () => ({
  requireConsent: vi.fn(async () => ({ preferredLanguage: 'en', genderIdentity: 'unspecified' })),
}))
vi.mock('../lib/safety', () => ({
  classifySafety: vi.fn(async () => ({ safetyState: 'normal' })),
  generateSafetyResponse: vi.fn(),
}))
vi.mock('../lib/interaction-mode', () => ({ classifyInteractionMode: vi.fn(async () => 'share') }))
vi.mock('../lib/roadmap', () => ({ roadmapExists: vi.fn(async () => true) }))
const consumeCredits = vi.fn(async () => undefined)
vi.mock('../lib/credits', () => ({ consumeCredits: (...a: unknown[]) => consumeCredits(...(a as [])), COMPANION_MESSAGE_COST: 1 }))
vi.mock('../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ pk: 'PROMPT#companion#respond', sk: 'VERSION#0001' })),
  promptRef: vi.fn(() => 'companion/respond@v1'),
}))
vi.mock('../lib/model-call', () => ({ callPromptModel: vi.fn(async () => ({ reply: 'fresh reply', directiveKind: 'none' })) }))
vi.mock('../lib/library-catalog', () => ({ listActiveTopics: vi.fn(async () => []) }))
vi.mock('../continuity/gather-context', () => ({
  gatherContinuityContext: vi.fn(async () => ({ confirmedSignals: [], openThreads: [], sessionSummaries: [] })),
}))

import { handler } from './message'

const ddbMock = mockClient(DynamoDBDocumentClient)
const USER = 'user-1'
const PK = `USER#${USER}`
const SID = 'conv-1'
const msgSk = (t: string) => `SESSION#${SID}#MSG#${t}`
const T1 = '2026-09-20T10:00:00.000Z' // user
const T2 = '2026-09-20T10:00:05.000Z' // assistant
const T3 = '2026-09-20T10:01:00.000Z' // user  <- edited
const T4 = '2026-09-20T10:01:05.000Z' // assistant

function event(body: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: JSON.stringify(body),
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function send(body: unknown) {
  const res = (await handler(event(body), {} as never, () => undefined)) as { statusCode: number; body: string }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}
const item = (t: string, role: 'user' | 'assistant', text: string) => ({ pk: PK, sk: msgSk(t), role, createdAt: t, content: { __enc: { text } } })

beforeEach(() => {
  ddbMock.reset()
  consumeCredits.mockReset()
  consumeCredits.mockResolvedValue(undefined)
  ddbMock.on(PutCommand).resolves({})
  ddbMock.on(UpdateCommand).resolves({})
  ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} })
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) => {
    if (input.Key.sk === `SESSION#${SID}`) return { Item: { pk: PK, sk: `SESSION#${SID}`, sessionId: SID, roomType: 'companion' } }
    if (input.Key.sk === msgSk(T3)) return { Item: item(T3, 'user', 'original question') }
    if (input.Key.sk === msgSk(T2)) return { Item: item(T2, 'assistant', 'a reply') }
    return {}
  })
  ddbMock.on(QueryCommand).callsFake((input: { KeyConditionExpression: string; ExpressionAttributeValues: Record<string, string>; ProjectionExpression?: string }) => {
    const all = [item(T1, 'user', 'first'), item(T2, 'assistant', 'a reply'), item(T3, 'user', 'original question'), item(T4, 'assistant', 'old answer')]
    if (input.ProjectionExpression === 'pk, sk') {
      // deleteMessagesInRange: [from, until] inclusive — the handler filters `until` itself
      const { ':from': from, ':until': until } = input.ExpressionAttributeValues
      const newUser = { pk: PK, sk: until }
      return { Items: [...all.filter((m) => m.sk >= from && m.sk <= until).map((m) => ({ pk: m.pk, sk: m.sk })), newUser] }
    }
    if (input.KeyConditionExpression.includes('BETWEEN')) {
      const before = input.ExpressionAttributeValues[':before']
      return { Items: all.filter((m) => m.sk <= before).reverse() } // descending, inclusive
    }
    return { Items: [...all].reverse() }
  })
})

describe('POST /v1/companion/message — edit & resend', () => {
  it('replaces the edited message and everything after it, using only earlier context', async () => {
    const { status, body } = await send({ text: 'edited question', clientMessageId: 'c1', sessionId: SID, replaceFromCreatedAt: T3 })
    expect(status).toBe(200)
    expect(body.reply).toBe('fresh reply')
    expect(body.userMessageCreatedAt).toBeDefined()
    expect(body.replyCreatedAt).toBeDefined()

    const deleted = ddbMock
      .commandCalls(BatchWriteCommand)
      .flatMap((c) => Object.values(c.args[0].input.RequestItems ?? {}).flat())
      .map((r) => (r as { DeleteRequest: { Key: { sk: string } } }).DeleteRequest.Key.sk)
    expect(deleted.sort()).toEqual([msgSk(T3), msgSk(T4)])
    // the new user message (the range's upper bound) is never deleted
    const newUserSk = ddbMock.commandCalls(PutCommand).map((c) => c.args[0].input.Item!.sk as string).find((sk) => sk > msgSk(T4))
    expect(deleted).not.toContain(newUserSk)
  })

  it('never deletes anything when the new reply fails (e.g. out of credits)', async () => {
    consumeCredits.mockRejectedValue(Object.assign(new Error('no credits'), { statusCode: 402, code: 'insufficient_credits' }))
    const { status } = await send({ text: 'edited question', clientMessageId: 'c2', sessionId: SID, replaceFromCreatedAt: T3 })
    expect(status).not.toBe(200)
    expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0)
  })

  it('refuses to "edit" a Companion reply or a message that does not exist', async () => {
    for (const t of [T2, '2026-01-01T00:00:00.000Z']) {
      ddbMock.resetHistory()
      const { status } = await send({ text: 'x', clientMessageId: `c-${t}`, sessionId: SID, replaceFromCreatedAt: t })
      expect(status).toBe(404)
      expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0)
    }
  })

  it('a normal (non-edit) send deletes nothing', async () => {
    const { status } = await send({ text: 'just a new message', clientMessageId: 'c3', sessionId: SID })
    expect(status).toBe(200)
    expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0)
  })
})
