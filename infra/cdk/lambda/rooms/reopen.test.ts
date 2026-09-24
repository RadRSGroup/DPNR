import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'

/**
 * REOPEN (Session 67): a finished Room session can be reopened at an answer
 * step. Reopening must undo what finishing produced (unconfirmed Twin
 * signals, the session summary) without touching the person's own
 * confirmed signals — and re-finishing must never earn the Mirror
 * completion credit twice.
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
const grantCredits = vi.fn(async () => undefined)
vi.mock('../lib/credits', () => ({
  consumeCredits: vi.fn(),
  grantCredits: (...a: unknown[]) => grantCredits(...(a as [])),
  ROOM_REFINE_COST: 1,
  EARN_REFLECTION_COMPLETED_CREDITS: 1,
}))
vi.mock('./twin-signals', () => ({
  extractCandidateSignals: vi.fn(async () => []),
  persistSessionSummary: vi.fn(async () => undefined),
}))

import { handler } from './command'

const ddbMock = mockClient(DynamoDBDocumentClient)
const USER = 'user-1'
const PK = `USER#${USER}`
const SID = 'room-1'

function event(body: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: JSON.stringify(body),
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function command(body: Record<string, unknown>) {
  const res = (await handler(event({ sessionId: SID, input: {}, idempotencyKey: `k-${Math.random()}`, ...body }), {} as never, () => undefined)) as {
    statusCode: number
    body: string
  }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}

function mockItems(items: Record<string, Record<string, unknown>>) {
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) => ({ Item: items[input.Key.sk] }))
}

beforeEach(() => {
  ddbMock.reset()
  grantCredits.mockClear()
  ddbMock.on(PutCommand).resolves({})
  ddbMock.on(DeleteCommand).resolves({})
  ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} })
  ddbMock.on(QueryCommand).resolves({ Items: [{ pk: PK, sk: 'TWIN#SIGNAL#pattern#s1' }] })
})

describe('REOPEN', () => {
  const completedSession = { pk: PK, sk: `SESSION#${SID}`, sessionId: SID, roomType: 'decision', status: 'completed', sessionVersion: 20, startedAt: '2026-09-01T00:00:00.000Z', currentStepId: 'COMMITMENT' }
  const decision = { pk: PK, sk: `ROOM#DECISION#${SID}`, decisionId: SID, status: 'completed', currentStep: 7, lens: 'pros_cons', content: { __enc: { title: 't', narrative: 'n' } }, createdAt: '2026-09-01T00:00:00.000Z' }

  it('reopens a finished decision at the chosen step and undoes its completion artifacts', async () => {
    mockItems({ [`SESSION#${SID}`]: completedSession, [`ROOM#DECISION#${SID}`]: decision })
    const { status, body } = await command({ flowId: 'DECISION', stepId: 'BODY_EMOTION', action: 'REOPEN', expectedSessionVersion: 20 })

    expect(status).toBe(200)
    expect(body).toMatchObject({ nextStepId: 'BODY_EMOTION', sessionVersion: 21 })

    // only UNCONFIRMED signals from THIS session are targeted
    const query = ddbMock.commandCalls(QueryCommand)[0].args[0].input
    expect(query.FilterExpression).toContain('sourceSessionId = :sid')
    expect(query.ExpressionAttributeValues).toMatchObject({ ':sid': SID, ':candidate': 'candidate' })
    expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(1)

    expect(ddbMock.commandCalls(DeleteCommand).map((c) => c.args[0].input.Key?.sk)).toContain(`SESSION#${SID}#SUMMARY`)

    const puts = ddbMock.commandCalls(PutCommand).map((c) => c.args[0].input)
    expect(puts.find((p) => p.Item?.sk === `ROOM#DECISION#${SID}`)?.Item).toMatchObject({ status: 'active', lens: 'pros_cons' })
    const session = puts.find((p) => p.Item?.sk === `SESSION#${SID}`)!
    expect(session.Item).toMatchObject({ status: 'active', currentStepId: 'BODY_EMOTION', sessionVersion: 21 })
    expect(session.Item?.endedAt).toBeUndefined()
    expect(session.ConditionExpression).toBe('sessionVersion = :expectedVersion')
  })

  it('refuses an in-progress session (use Back instead)', async () => {
    mockItems({ [`SESSION#${SID}`]: { ...completedSession, status: 'active' } })
    const { status, body } = await command({ flowId: 'DECISION', stepId: 'BODY_EMOTION', action: 'REOPEN', expectedSessionVersion: 20 })
    expect(status).toBe(409)
    expect(body.error.code).toBe('session_not_completed')
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('refuses a summary/interstitial step and a stale version, changing nothing', async () => {
    mockItems({ [`SESSION#${SID}`]: completedSession })
    const summaryStep = await command({ flowId: 'DECISION', stepId: 'SESSION_SUMMARY', action: 'REOPEN', expectedSessionVersion: 20 })
    expect(summaryStep.status).toBe(400)
    const stale = await command({ flowId: 'DECISION', stepId: 'BODY_EMOTION', action: 'REOPEN', expectedSessionVersion: 19 })
    expect(stale.status).toBe(409)
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0)
  })

  it('still blocks ordinary commands on a finished session', async () => {
    mockItems({ [`SESSION#${SID}`]: completedSession })
    const { status, body } = await command({ flowId: 'DECISION', stepId: 'BODY_EMOTION', action: 'SUBMIT_STEP', expectedSessionVersion: 20 })
    expect(status).toBe(409)
    expect(body.error.code).toBe('session_completed')
  })
})

describe('Mirror re-finish after REOPEN', () => {
  const content = {
    situation: 's', trigger: 't', thought: 'th', emotion: 'e', bodyResponse: 'b', automaticReaction: 'a',
    copingResponse: 'c', recurringPattern: 'r', energyMoodEffect: 'm', lifeDomain: 'l', commitment: '',
  }
  const activeSession = { pk: PK, sk: `SESSION#${SID}`, sessionId: SID, roomType: 'mirror', status: 'active', sessionVersion: 30, startedAt: '2026-09-01T00:00:00.000Z' }

  it('does not grant the completion credit a second time', async () => {
    mockItems({
      [`SESSION#${SID}`]: activeSession,
      [`ROOM#MIRROR#${SID}`]: { pk: PK, sk: `ROOM#MIRROR#${SID}`, mirrorId: SID, status: 'active', content: { __enc: content }, reflectionCreditGrantedAt: '2026-09-02T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z' },
    })
    const { status } = await command({ flowId: 'MIRROR', stepId: 'COMMITMENT', action: 'SUBMIT_STEP', expectedSessionVersion: 30, input: { commitment: 'again' } })
    expect(status).toBe(200)
    expect(grantCredits).not.toHaveBeenCalled()
  })

  it('grants it the first time and records that it did', async () => {
    mockItems({
      [`SESSION#${SID}`]: activeSession,
      [`ROOM#MIRROR#${SID}`]: { pk: PK, sk: `ROOM#MIRROR#${SID}`, mirrorId: SID, status: 'active', content: { __enc: content }, createdAt: '2026-09-01T00:00:00.000Z' },
    })
    await command({ flowId: 'MIRROR', stepId: 'COMMITMENT', action: 'SUBMIT_STEP', expectedSessionVersion: 30, input: {} })
    expect(grantCredits).toHaveBeenCalledTimes(1)
    const mirrorPut = ddbMock.commandCalls(PutCommand).map((c) => c.args[0].input.Item!).find((i) => i.sk === `ROOM#MIRROR#${SID}`)
    expect(mirrorPut?.reflectionCreditGrantedAt).toBeDefined()
  })

  it('resubmitting SITUATION keeps later answers, creation date and the credit marker', async () => {
    mockItems({
      [`SESSION#${SID}`]: activeSession,
      [`ROOM#MIRROR#${SID}`]: { pk: PK, sk: `ROOM#MIRROR#${SID}`, mirrorId: SID, status: 'active', content: { __enc: content }, reflectionCreditGrantedAt: '2026-09-02T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z' },
    })
    const { status } = await command({ flowId: 'MIRROR', stepId: 'SITUATION', action: 'SUBMIT_STEP', expectedSessionVersion: 30, input: { situation: 'new s', trigger: 'new t' } })
    expect(status).toBe(200)
    const put = ddbMock.commandCalls(PutCommand).map((c) => c.args[0].input.Item!).find((i) => i.sk === `ROOM#MIRROR#${SID}`)!
    expect(put.createdAt).toBe('2026-09-01T00:00:00.000Z')
    expect(put.reflectionCreditGrantedAt).toBe('2026-09-02T00:00:00.000Z')
    expect((put.content as { __enc: typeof content }).__enc).toMatchObject({ situation: 'new s', thought: 'th', commitment: '' })
  })
})
