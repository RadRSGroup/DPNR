import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { handler } from './delete-conversation'

const ddbMock = mockClient(DynamoDBDocumentClient)
const USER = 'user-1'
const PK = `USER#${USER}`
const SID = 'conv-1'

function event(sessionId: string | undefined): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    pathParameters: sessionId ? { sessionId } : undefined,
    requestContext: { authorizer: { jwt: { claims: { sub: USER } } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

async function invoke(sessionId: string | undefined) {
  const res = (await handler(event(sessionId), {} as never, () => undefined)) as { statusCode: number; body: string }
  return { status: res.statusCode, body: JSON.parse(res.body) }
}

function mockSession(roomType: string | null, pointerSessionId: string | null) {
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) => {
    if (input.Key.sk === `SESSION#${SID}`) {
      return { Item: roomType ? { pk: PK, sk: `SESSION#${SID}`, sessionId: SID, roomType } : undefined }
    }
    if (input.Key.sk === 'COMPANION#ACTIVE_SESSION') {
      return { Item: pointerSessionId ? { pk: PK, sk: 'COMPANION#ACTIVE_SESSION', sessionId: pointerSessionId } : undefined }
    }
    return {}
  })
}

describe('DELETE /v1/companion/conversations/{sessionId}', () => {
  beforeEach(() => {
    ddbMock.reset()
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { pk: PK, sk: `SESSION#${SID}#MSG#2026-09-01T00:00:00.000Z` },
        { pk: PK, sk: `SESSION#${SID}#MSG#2026-09-01T00:01:00.000Z` },
      ],
    })
    ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} })
    ddbMock.on(DeleteCommand).resolves({})
  })

  it('deletes the conversation, its messages, and the pointer when it was the active one', async () => {
    mockSession('companion', SID)
    const { status, body } = await invoke(SID)

    expect(status).toBe(200)
    expect(body).toEqual({ deleted: true, wasActive: true })

    const query = ddbMock.commandCalls(QueryCommand)[0].args[0].input
    expect(query.ExpressionAttributeValues).toEqual({ ':pk': PK, ':prefix': `SESSION#${SID}#` })

    const batched = ddbMock.commandCalls(BatchWriteCommand).flatMap((c) => Object.values(c.args[0].input.RequestItems ?? {}).flat())
    expect(batched).toHaveLength(2)

    const deletedSks = ddbMock.commandCalls(DeleteCommand).map((c) => c.args[0].input.Key?.sk)
    expect(deletedSks).toEqual([`SESSION#${SID}`, 'COMPANION#ACTIVE_SESSION'])
  })

  it('leaves the pointer alone when a different conversation is active', async () => {
    mockSession('companion', 'other-conv')
    const { status, body } = await invoke(SID)

    expect(status).toBe(200)
    expect(body.wasActive).toBe(false)
    const deletedSks = ddbMock.commandCalls(DeleteCommand).map((c) => c.args[0].input.Key?.sk)
    expect(deletedSks).toEqual([`SESSION#${SID}`])
  })

  it('refuses to delete a Room session through this route (404, nothing deleted)', async () => {
    mockSession('decision', SID)
    const { status } = await invoke(SID)

    expect(status).toBe(404)
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0)
    expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(0)
  })

  it('404s for a conversation that does not exist, deleting nothing', async () => {
    mockSession(null, null)
    const { status } = await invoke(SID)

    expect(status).toBe(404)
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(0)
  })

  it('only ever reads/writes under the caller’s own partition', async () => {
    mockSession('companion', SID)
    await invoke(SID)
    const keys = [
      ...ddbMock.commandCalls(GetCommand).map((c) => c.args[0].input.Key?.pk),
      ...ddbMock.commandCalls(DeleteCommand).map((c) => c.args[0].input.Key?.pk),
    ]
    expect(new Set(keys)).toEqual(new Set([PK]))
  })
})
