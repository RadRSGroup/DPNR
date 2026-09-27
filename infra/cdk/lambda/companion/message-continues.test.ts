import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

/**
 * Fresh entry (2026-09-27): the first message of a new conversation may name
 * the conversation its welcome-back line recalled. That conversation's tail
 * is given to the model as background for this first reply only, read from
 * the caller's own partition.
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
vi.mock('../lib/credits', () => ({ consumeCredits: vi.fn(async () => undefined), COMPANION_MESSAGE_COST: 1 }))
vi.mock('../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ pk: 'PROMPT#companion#respond', sk: 'VERSION#0001' })),
  promptRef: vi.fn(() => 'companion/respond@v1'),
}))
const callPromptModel = vi.fn(async (_v: unknown, _vars: Record<string, string>) => ({ reply: 'reply', directiveKind: 'none' }))
vi.mock('../lib/model-call', () => ({ callPromptModel: (v: unknown, vars: Record<string, string>) => callPromptModel(v, vars) }))
vi.mock('../lib/library-catalog', () => ({ listActiveTopics: vi.fn(async () => []) }))
vi.mock('../continuity/gather-context', () => ({
  gatherContinuityContext: vi.fn(async () => ({ confirmedSignals: [], openThreads: [], sessionSummaries: [] })),
}))

import { handler } from './message'

const ddbMock = mockClient(DynamoDBDocumentClient)
const USER = 'user-1'
const PK = `USER#${USER}`
const NEW = 'conv-new'
const OLD = 'conv-old'

function event(body: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: JSON.stringify(body),
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function send(body: unknown) {
  const res = (await handler(event(body), {} as never, () => undefined)) as { statusCode: number }
  return res.statusCode
}
const oldItem = (t: string, role: 'user' | 'assistant', text: string) => ({
  pk: PK,
  sk: `SESSION#${OLD}#MSG#${t}`,
  role,
  createdAt: t,
  content: { __enc: { text } },
})

let newHasHistory = false
const queriedPrefixes: string[] = []

beforeEach(() => {
  ddbMock.reset()
  callPromptModel.mockClear()
  queriedPrefixes.length = 0
  newHasHistory = false
  ddbMock.on(PutCommand).resolves({})
  ddbMock.on(UpdateCommand).resolves({})
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) =>
    input.Key.sk === `SESSION#${NEW}` ? { Item: { pk: PK, sk: `SESSION#${NEW}`, sessionId: NEW, roomType: 'companion' } } : {}
  )
  ddbMock.on(QueryCommand).callsFake((input: { ExpressionAttributeValues: Record<string, string> }) => {
    expect(input.ExpressionAttributeValues[':pk']).toBe(PK) // only ever the caller's own partition
    const prefix = input.ExpressionAttributeValues[':prefix'] ?? ''
    queriedPrefixes.push(prefix)
    if (prefix.startsWith(`SESSION#${OLD}#`)) {
      return { Items: [oldItem('2026-09-26T10:00:05.000Z', 'assistant', 'What part is still with you?'), oldItem('2026-09-26T10:00:00.000Z', 'user', 'A hard talk with my manager.')] }
    }
    if (prefix.startsWith(`SESSION#${NEW}#`) && newHasHistory) {
      return { Items: [{ pk: PK, sk: `SESSION#${NEW}#MSG#2026-09-27T09:00:00.000Z`, role: 'user', createdAt: '2026-09-27T09:00:00.000Z', content: { __enc: { text: 'earlier in the new one' } } }] }
    }
    return { Items: [] }
  })
})

describe('POST /v1/companion/message — continuesFromSessionId', () => {
  it("gives the recalled conversation's tail to the first reply of a new conversation", async () => {
    expect(await send({ text: 'Yes, still that.', clientMessageId: 'c1', sessionId: NEW, continuesFromSessionId: OLD })).toBe(200)
    const history = callPromptModel.mock.calls.at(-1)![1].conversationHistory
    expect(history).toMatch(/Last conversation:/)
    expect(history).toMatch(/User: A hard talk with my manager\./)
    expect(history).toMatch(/Companion: What part is still with you\?/)
  })

  it('ignores it once the new conversation has history of its own', async () => {
    newHasHistory = true
    expect(await send({ text: 'next', clientMessageId: 'c2', sessionId: NEW, continuesFromSessionId: OLD })).toBe(200)
    expect(queriedPrefixes.some((p) => p.startsWith(`SESSION#${OLD}#`))).toBe(false)
    expect(callPromptModel.mock.calls.at(-1)![1].conversationHistory).not.toMatch(/Last conversation:/)
  })

  it('is a no-op without it', async () => {
    expect(await send({ text: 'hello', clientMessageId: 'c3', sessionId: NEW })).toBe(200)
    expect(queriedPrefixes.some((p) => p.startsWith(`SESSION#${OLD}#`))).toBe(false)
  })
})
