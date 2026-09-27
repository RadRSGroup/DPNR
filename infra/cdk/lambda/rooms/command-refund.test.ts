import { CURRENT_CONSENT_VERSION } from '@dpnr/shared-types'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { HttpError } from '../lib/http'

/**
 * Slice 6: a REFINE is charged before the model call; when the model is
 * unavailable (or returns nothing usable) the person gets the credit back and
 * a 503 `model_unavailable` instead of a 500.
 */

vi.mock('../lib/session-crypto', () => ({
  getSessionCrypto: vi.fn(async () => ({
    encryptField: async (value: unknown) => ({ value }),
    decryptField: async (blob: { value: unknown }) => blob.value,
  })),
}))
const consumeCredits = vi.fn(async () => 49)
const grantCredits = vi.fn(async () => 50)
vi.mock('../lib/credits', async (orig) => ({
  ...(await orig<typeof import('../lib/credits')>()),
  consumeCredits: (...args: unknown[]) => consumeCredits(...(args as [])),
  grantCredits: (...args: unknown[]) => grantCredits(...(args as [])),
}))
vi.mock('../lib/prompt-registry', async (orig) => ({
  ...(await orig<typeof import('../lib/prompt-registry')>()),
  resolvePromptVersion: vi.fn(async () => ({ sk: 'VERSION#0001' })),
}))
let modelError: Error = new HttpError(503, 'model_unavailable', 'DPNR is briefly unavailable.')
vi.mock('../lib/model-call', async (orig) => ({
  ...(await orig<typeof import('../lib/model-call')>()),
  callPromptModel: vi.fn(async () => {
    throw modelError
  }),
}))

const ddbMock = mockClient(DynamoDBDocumentClient)
const items = new Map<string, Record<string, unknown>>()

function event(): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: null } } },
    body: JSON.stringify({
      sessionId: 'd1',
      flowId: 'DECISION',
      stepId: 'BODY_EMOTION',
      action: 'REFINE',
      expectedSessionVersion: 2,
      idempotencyKey: `idem-${Math.random()}`,
      input: { bodyLocation: 'Chest', emotion: 'Fear' },
    }),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

beforeEach(() => {
  ddbMock.reset()
  vi.clearAllMocks()
  items.clear()
  items.set('USER#user-1|PROFILE', {
    consentedAt: '2026-09-22T00:00:00.000Z',
    consentVersion: CURRENT_CONSENT_VERSION,
    ageConfirmedAt: '2026-09-22T00:00:00.000Z',
    preferredLanguage: 'en',
    genderIdentity: 'unspecified',
  })
  items.set('USER#user-1|SESSION#d1', {
    pk: 'USER#user-1', sk: 'SESSION#d1', sessionId: 'd1', roomType: 'decision', status: 'active',
    currentStepId: 'BODY_EMOTION', sessionVersion: 2, startedAt: '2026-09-27T00:00:00.000Z',
  })
  items.set('USER#user-1|ROOM#DECISION#d1', {
    pk: 'USER#user-1', sk: 'ROOM#DECISION#d1',
    content: { value: { title: 'Take the job?', subtitle: null, narrative: 'Back and forth.' } },
  })
  ddbMock.on(GetCommand).callsFake((input) => ({ Item: items.get(`${input.Key.pk}|${input.Key.sk}`) }))
  ddbMock.on(PutCommand).callsFake((input) => {
    items.set(`${input.Item.pk}|${input.Item.sk}`, input.Item)
    return {}
  })
})

describe('REFINE refund on model failure', () => {
  it('returns 503 model_unavailable and gives the credit back', async () => {
    modelError = new HttpError(503, 'model_unavailable', 'DPNR is briefly unavailable.')
    const { handler } = await import('./command')
    const res = (await handler(event(), {} as never, {} as never)) as { statusCode: number; body: string }
    expect(res.statusCode).toBe(503)
    expect(JSON.parse(res.body).error.code).toBe('model_unavailable')
    expect(consumeCredits).toHaveBeenCalledTimes(1)
    expect(grantCredits).toHaveBeenCalledTimes(1)
    expect(grantCredits.mock.calls[0]).toEqual(expect.arrayContaining(['refund', 'room_refine_model_failure']))
    // The session did not advance.
    expect(items.get('USER#user-1|SESSION#d1')?.sessionVersion).toBe(2)
  })

  it('does not refund an unrelated error', async () => {
    modelError = new Error('boom')
    const { handler } = await import('./command')
    const res = (await handler(event(), {} as never, {} as never)) as { statusCode: number }
    expect(res.statusCode).toBe(500)
    expect(grantCredits).not.toHaveBeenCalled()
  })
})
