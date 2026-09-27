import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { RITUALS_MAX } from '@dpnr/shared-types'

/**
 * My Profile personal space (Session 74): rituals + private journal.
 * Ownership is structural (the partition always comes from the JWT),
 * writes need consent, reads/deletes don't, text is only ever stored
 * encrypted.
 */

vi.mock('../lib/session-crypto', () => ({
  getSessionCrypto: vi.fn(async () => ({
    encryptField: async (value: unknown) => ({ ciphertext: JSON.stringify(value), __enc: value }),
    decryptField: async (blob: { __enc: unknown }) => blob.__enc,
  })),
}))
const requireConsent = vi.fn(async () => ({}))
vi.mock('../lib/consent', () => ({ requireConsent: (...a: unknown[]) => requireConsent(...(a as [])) }))

import { handler, newEntryId } from './handler'

const ddbMock = mockClient(DynamoDBDocumentClient)
const PK = 'USER#user-1'

function ev(routeKey: string, opts: { body?: unknown; id?: string; cursor?: string } = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    routeKey,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    pathParameters: opts.id ? { id: opts.id } : undefined,
    queryStringParameters: opts.cursor ? { cursor: opts.cursor } : undefined,
    requestContext: { authorizer: { jwt: { claims: { sub: 'user-1' } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}
async function call(e: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const res = (await handler(e, {} as never, () => undefined)) as { statusCode: number; body: string }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}
const enc = (v: unknown) => ({ ciphertext: 'x', __enc: v })

beforeEach(() => {
  ddbMock.reset()
  requireConsent.mockClear()
  ddbMock.on(PutCommand).resolves({})
  ddbMock.on(QueryCommand).resolves({ Items: [] })
})

describe('rituals', () => {
  it('creates a ritual in the caller\'s own partition with the text encrypted, after the consent check', async () => {
    const res = await call(ev('POST /v1/rituals', { body: { timeOfDay: 'morning', text: '  Three slow breaths  ' } }))
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ timeOfDay: 'morning', text: 'Three slow breaths' })
    expect(requireConsent).toHaveBeenCalledTimes(1)
    const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as Record<string, unknown>
    expect(item.pk).toBe(PK)
    expect(item.sk).toBe(`RITUAL#${res.body.ritualId}`)
    expect(item.text).toBeUndefined()
    expect((item.content as { __enc: unknown }).__enc).toEqual({ text: 'Three slow breaths' })
  })

  it('rejects bad input and the per-person cap', async () => {
    expect((await call(ev('POST /v1/rituals', { body: { timeOfDay: 'night', text: 'x' } }))).status).toBe(400)
    expect((await call(ev('POST /v1/rituals', { body: { timeOfDay: 'morning', text: '   ' } }))).status).toBe(400)
    ddbMock.on(QueryCommand).resolves({ Items: Array.from({ length: RITUALS_MAX }, () => ({})) })
    const capped = await call(ev('POST /v1/rituals', { body: { timeOfDay: 'evening', text: 'one more' } }))
    expect(capped.status).toBe(409)
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('lists (decrypted, oldest first) without a consent check', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [
      { ritualId: 'b', timeOfDay: 'evening', content: enc({ text: 'Tea' }), createdAt: '2026-09-27T10:00:00.000Z', updatedAt: '2026-09-27T10:00:00.000Z' },
      { ritualId: 'a', timeOfDay: 'morning', content: enc({ text: 'Walk' }), createdAt: '2026-09-26T10:00:00.000Z', updatedAt: '2026-09-26T10:00:00.000Z' },
    ] })
    const res = await call(ev('GET /v1/rituals'))
    expect(res.body.rituals.map((r: { text: string }) => r.text)).toEqual(['Walk', 'Tea'])
    expect(requireConsent).not.toHaveBeenCalled()
    expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input.ExpressionAttributeValues).toMatchObject({ ':pk': PK, ':prefix': 'RITUAL#' })
  })

  it('updates only the time of day and keeps the stored text', async () => {
    const id = '11111111-2222-3333-4444-555555555555'
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: `RITUAL#${id}`, ritualId: id, timeOfDay: 'morning', content: enc({ text: 'Walk' }), createdAt: '2026-09-26T10:00:00.000Z', updatedAt: '2026-09-26T10:00:00.000Z' } })
    const res = await call(ev('PUT /v1/rituals/{id}', { id, body: { timeOfDay: 'evening' } }))
    expect(res.body).toMatchObject({ timeOfDay: 'evening', text: 'Walk' })
    expect(ddbMock.commandCalls(GetCommand)[0].args[0].input.Key).toEqual({ pk: PK, sk: `RITUAL#${id}` })
    expect((await call(ev('PUT /v1/rituals/{id}', { id, body: {} }))).status).toBe(400)
  })

  it('deletes only inside the caller\'s partition, 404s a missing one, and rejects malformed ids', async () => {
    const id = '11111111-2222-3333-4444-555555555555'
    ddbMock.on(DeleteCommand).resolves({})
    expect((await call(ev('DELETE /v1/rituals/{id}', { id }))).status).toBe(200)
    expect(ddbMock.commandCalls(DeleteCommand)[0].args[0].input.Key).toEqual({ pk: PK, sk: `RITUAL#${id}` })
    const missing = new Error('x'); missing.name = 'ConditionalCheckFailedException'
    ddbMock.on(DeleteCommand).rejects(missing)
    expect((await call(ev('DELETE /v1/rituals/{id}', { id }))).status).toBe(404)
    expect((await call(ev('DELETE /v1/rituals/{id}', { id: '../USER#other' }))).status).toBe(400)
  })
})

describe('journal', () => {
  it('entry ids sort by creation time', () => {
    expect(newEntryId(1000) < newEntryId(2000)).toBe(true)
    expect(newEntryId(99999999999) < newEntryId(100000000000)).toBe(true)
  })

  it('creates an entry encrypted in the caller\'s partition after the consent check; empty title is dropped', async () => {
    const res = await call(ev('POST /v1/journal', { body: { title: '  ', body: 'Today I noticed…' } }))
    expect(res.status).toBe(201)
    expect(res.body.title).toBeUndefined()
    expect(requireConsent).toHaveBeenCalledTimes(1)
    const item = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as Record<string, unknown>
    expect(item.pk).toBe(PK)
    expect(item.body).toBeUndefined()
    expect((item.content as { __enc: unknown }).__enc).toEqual({ body: 'Today I noticed…' })
  })

  it('lists newest first with an opaque cursor that stays inside the caller\'s partition', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ entryId: '000001000000000-aaaaaaaa', content: enc({ body: 'b' }), createdAt: '2026-09-27T10:00:00.000Z', updatedAt: '2026-09-27T10:00:00.000Z' }],
      LastEvaluatedKey: { pk: PK, sk: 'JOURNAL#000001000000000-aaaaaaaa' },
    })
    const first = await call(ev('GET /v1/journal'))
    expect(first.body.entries[0].body).toBe('b')
    expect(ddbMock.commandCalls(QueryCommand)[0].args[0].input.ScanIndexForward).toBe(false)
    await call(ev('GET /v1/journal', { cursor: first.body.nextCursor }))
    expect(ddbMock.commandCalls(QueryCommand)[1].args[0].input.ExclusiveStartKey).toEqual({ pk: PK, sk: 'JOURNAL#000001000000000-aaaaaaaa' })
    const forged = Buffer.from('RITUAL#x', 'utf-8').toString('base64url')
    expect((await call(ev('GET /v1/journal', { cursor: forged }))).status).toBe(400)
  })

  it('edits keep the original creation date; editing a missing entry 404s', async () => {
    const id = '000001000000000-aaaaaaaa'
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: `JOURNAL#${id}`, entryId: id, content: enc({ body: 'old' }), createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' } })
    const res = await call(ev('PUT /v1/journal/{id}', { id, body: { title: 'Sunday', body: 'new' } }))
    expect(res.body).toMatchObject({ entryId: id, title: 'Sunday', body: 'new', createdAt: '2026-09-01T00:00:00.000Z' })
    ddbMock.on(GetCommand).resolves({ Item: undefined })
    expect((await call(ev('PUT /v1/journal/{id}', { id, body: { body: 'x' } }))).status).toBe(404)
  })

  it('401s with no sub and never touches the table', async () => {
    const e = ev('GET /v1/journal')
    ;(e.requestContext.authorizer.jwt as { claims: Record<string, unknown> }).claims = {}
    expect((await call(e)).status).toBe(401)
    expect(ddbMock.calls()).toHaveLength(0)
  })
})
