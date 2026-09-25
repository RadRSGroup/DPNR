import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { Jimp } from 'jimp'

const classifySafety = vi.fn()
vi.mock('../lib/safety', () => ({ classifySafety: (...args: unknown[]) => classifySafety(...args) }))

import { handler as startHandler } from './vision-start'
import { handler as workerHandler } from './vision-worker'
import { handler as preferencesHandler } from './preferences'
import { reserveVisionGeneration } from '../lib/vision-quota'

const ddbMock = mockClient(DynamoDBDocumentClient)
const lambdaMock = mockClient(LambdaClient)
const s3Mock = mockClient(S3Client)
const bedrockMock = mockClient(BedrockRuntimeClient)

const USER = 'user-1'
const PK = `USER#${USER}`
const AVATAR_KEY = `avatars/${USER}/abc.jpg`

function apiEvent(body: unknown): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: JSON.stringify(body),
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

async function call(h: typeof startHandler, body: unknown) {
  const res = (await h(apiEvent(body), {} as never, () => undefined)) as { statusCode: number; body: string }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}

const normal = { safetyState: 'normal', confidence: 0.9, reasonCodes: [], requiresHumanSupport: false, suspendDeepWork: false, localeSupportNeeded: false }

function updatesTo(skPrefix: string) {
  return ddbMock.commandCalls(UpdateCommand).filter((c) => String(c.args[0].input.Key?.sk).startsWith(skPrefix))
}

beforeEach(() => {
  ddbMock.reset()
  lambdaMock.reset()
  s3Mock.reset()
  bedrockMock.reset()
  classifySafety.mockReset()
})

describe('vision quota', () => {
  it('turns a failed conditional increment into a 429 vision_limit_reached', async () => {
    ddbMock.on(UpdateCommand).rejects(Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' }))
    await expect(reserveVisionGeneration(ddbMock as unknown as DynamoDBDocumentClient, 't', PK)).rejects.toMatchObject({
      statusCode: 429,
      code: 'vision_limit_reached',
    })
  })
})

describe('POST /v1/user/chat-background/vision', () => {
  it('409s without a profile photo, before any safety call or quota use', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'PROFILE', avatarKey: null } })
    const { status, body } = await call(startHandler, { prompt: 'a quiet cabin by a lake' })
    expect(status).toBe(409)
    expect(body.error?.code ?? body.code).toBe('avatar_required')
    expect(classifySafety).not.toHaveBeenCalled()
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('declines a scene the safety classifier flags, without spending quota or starting the worker', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'PROFILE', avatarKey: AVATAR_KEY } })
    classifySafety.mockResolvedValue({ ...normal, safetyState: 'concern' })
    const { status } = await call(startHandler, { prompt: 'something the classifier flags' })
    expect(status).toBe(422)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
    expect(lambdaMock.commandCalls(InvokeCommand)).toHaveLength(0)
  })

  it('reserves quota, writes a job with no user text, and hands the prompt to the worker only via the payload', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'PROFILE', avatarKey: AVATAR_KEY } })
    ddbMock.on(UpdateCommand).resolves({ Attributes: { count: 1 } })
    ddbMock.on(PutCommand).resolves({})
    lambdaMock.on(InvokeCommand).resolves({})
    classifySafety.mockResolvedValue(normal)

    const { status, body } = await call(startHandler, { prompt: 'running my own bakery at sunrise' })
    expect(status).toBe(202)
    expect(body.remainingThisMonth).toBe(2)

    const job = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item!
    expect(job.status).toBe('pending')
    expect(JSON.stringify(job)).not.toContain('bakery')

    const invoke = lambdaMock.commandCalls(InvokeCommand)[0].args[0].input
    expect(invoke.InvocationType).toBe('Event')
    const payload = JSON.parse(Buffer.from(invoke.Payload as Uint8Array).toString())
    expect(payload).toMatchObject({ userId: USER, prompt: 'running my own bakery at sunrise', avatarKey: AVATAR_KEY })
  })

  it('refunds the reserved generation if the worker cannot be started', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'PROFILE', avatarKey: AVATAR_KEY } })
    ddbMock.on(UpdateCommand).resolves({ Attributes: { count: 1 } })
    ddbMock.on(PutCommand).resolves({})
    lambdaMock.on(InvokeCommand).rejects(new Error('boom'))
    classifySafety.mockResolvedValue(normal)

    const { status } = await call(startHandler, { prompt: 'a garden I planted myself' })
    expect(status).toBe(500)
    const quotaUpdates = updatesTo('VISION#QUOTA#').map((c) => c.args[0].input.ExpressionAttributeValues)
    expect(quotaUpdates).toHaveLength(2)
    expect(quotaUpdates[1]).toMatchObject({ ':minusOne': -1 })
  })
})

describe('vision worker', () => {
  async function png(w: number, h: number, color: number) {
    return (await new Jimp({ width: w, height: h, color }).getBuffer('image/png')).toString('base64')
  }

  const payload = { userId: USER, jobId: 'job-1', prompt: 'a lighthouse at dusk', avatarKey: AVATAR_KEY, quotaMonth: '2026-09' }

  beforeEach(async () => {
    const photo = Buffer.from(await png(64, 64, 0xff0000ff), 'base64')
    s3Mock.on(GetObjectCommand).resolves({ Body: { transformToByteArray: async () => new Uint8Array(photo) } } as never)
    s3Mock.on(PutObjectCommand).resolves({})
    ddbMock.on(UpdateCommand).resolves({})
  })

  it('generates, stores under the caller prefix, sets it as the chat background, and marks the job done', async () => {
    const cutout = await png(64, 64, 0x00ff0080)
    const scene = await png(1792, 1024, 0x0000ffff)
    bedrockMock
      .on(InvokeModelCommand)
      .resolvesOnce({ body: new TextEncoder().encode(JSON.stringify({ images: [cutout], finish_reasons: [null] })) } as never)
      .resolvesOnce({ body: new TextEncoder().encode(JSON.stringify({ images: [scene], finish_reasons: [null] })) } as never)

    await workerHandler(payload)

    const inpaint = JSON.parse(bedrockMock.commandCalls(InvokeModelCommand)[1].args[0].input.body as string)
    expect(inpaint.negative_prompt).toMatch(/hanging/)
    expect(inpaint.mask).toBeUndefined() // mask derived from the canvas alpha

    const put = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input
    expect(put.Key).toBe(`chat-backgrounds/${USER}/vision-job-1.jpg`)

    const profile = updatesTo('PROFILE')[0].args[0].input
    expect(profile.ExpressionAttributeValues).toMatchObject({ ':custom': 'custom', ':key': put.Key })
    expect(updatesTo('VISION#JOB#')[0].args[0].input.ExpressionAttributeValues).toMatchObject({ ':status': 'done' })
  })

  it('marks a content-filtered generation failed and refunds it, leaving the profile untouched', async () => {
    const cutout = await png(64, 64, 0x00ff0080)
    bedrockMock
      .on(InvokeModelCommand)
      .resolvesOnce({ body: new TextEncoder().encode(JSON.stringify({ images: [cutout], finish_reasons: [null] })) } as never)
      .resolvesOnce({ body: new TextEncoder().encode(JSON.stringify({ images: [], finish_reasons: ['Filter reason: prompt'] })) } as never)

    await workerHandler(payload)

    expect(updatesTo('PROFILE')).toHaveLength(0)
    expect(updatesTo('VISION#QUOTA#')[0].args[0].input.ExpressionAttributeValues).toMatchObject({ ':minusOne': -1 })
    expect(updatesTo('VISION#JOB#')[0].args[0].input.ExpressionAttributeValues).toMatchObject({
      ':status': 'failed',
      ':errorCode': 'content_filtered',
    })
  })

  it('refuses an avatar key outside the caller prefix without calling any model', async () => {
    await workerHandler({ ...payload, avatarKey: 'avatars/someone-else/x.jpg' })
    expect(bedrockMock.commandCalls(InvokeModelCommand)).toHaveLength(0)
    expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(0)
  })
})

describe('PUT /v1/user/preferences ownership check', () => {
  it.each([
    ['avatarKey', 'avatars/someone-else/a.jpg'],
    ['chatBackgroundKey', 'chat-backgrounds/someone-else/b.jpg'],
    ['chatBackgroundKey', `chat-backgrounds/${USER}/../someone-else/b.jpg`],
  ])('rejects a %s outside the caller prefix (%s)', async (field, key) => {
    const { status } = await call(preferencesHandler, { [field]: key })
    expect(status).toBe(400)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })

  it('accepts the caller’s own keys', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { preferredLanguage: 'en', genderIdentity: 'female' } })
    ddbMock.on(GetCommand).resolves({})
    const { status } = await call(preferencesHandler, { avatarKey: AVATAR_KEY })
    expect(status).toBe(200)
  })
})

describe('PUT /v1/user/preferences firstName (Session 70)', () => {
  it('stores a trimmed name and returns it', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { preferredLanguage: 'en', genderIdentity: 'female', firstName: 'Lital' } })
    ddbMock.on(GetCommand).resolves({})
    const { status, body } = await call(preferencesHandler, { firstName: '  Lital ' })
    expect(status).toBe(200)
    expect(body.firstName).toBe('Lital')
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(input.ExpressionAttributeValues?.[':firstName']).toBe('Lital')
  })

  it('clears the name when given an empty string', async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { preferredLanguage: 'en', genderIdentity: 'female' } })
    ddbMock.on(GetCommand).resolves({})
    const { status, body } = await call(preferencesHandler, { firstName: '   ' })
    expect(status).toBe(200)
    expect(body.firstName).toBeNull()
    expect(ddbMock.commandCalls(UpdateCommand)[0].args[0].input.ExpressionAttributeValues?.[':firstName']).toBeNull()
  })

  it.each([['a'.repeat(41)], ['Li\ntal']])('rejects an invalid name (%j)', async (firstName) => {
    const { status } = await call(preferencesHandler, { firstName })
    expect(status).toBe(400)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })
})
