import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { handler } from './delete'

/**
 * Security review 2026-09-14 (DPNR-09) — this handler used to delete only
 * the application table's partition; Session 8 of the remediation plan
 * fixed it to also delete every session ticket first. These tests exist so
 * a future change can't silently regress back to leaving tickets behind —
 * exactly the gap the real security review flagged.
 */

const ddbMock = mockClient(DynamoDBDocumentClient)

function eventFor(userId: string): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { authorizer: { jwt: { claims: { sub: userId }, scopes: null } } },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

beforeEach(() => {
  ddbMock.reset()
})

describe('DELETE /v1/account', () => {
  it('deletes the session-tickets partition before the application-table partition', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'USER#user-1', sk: 'TICKET#1' }] })
    ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} })

    const result = (await handler(eventFor('user-1'), {} as never, {} as never)) as {
      statusCode: number
      body: string
    }
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ deleted: true })

    const queries = ddbMock.commandCalls(QueryCommand)
    expect(queries).toHaveLength(2)
    expect(queries[0].args[0].input.TableName).toBe('dpnr-session-tickets-test')
    expect(queries[1].args[0].input.TableName).toBe('dpnr-application-test')
    // Order matters (DPNR-09's own fix note: "revoke sessions first") —
    // the session-tickets query must be issued strictly before the
    // application-table one, not just both eventually happen.
    expect(queries[0].args[0].input.KeyConditionExpression).toBe('pk = :pk')
  })

  it('retries UnprocessedItems from a batch delete up to the documented retry cap', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'USER#user-1', sk: 'TICKET#1' }] })
    ddbMock
      .on(BatchWriteCommand)
      .resolvesOnce({ UnprocessedItems: { 'dpnr-session-tickets-test': [{ DeleteRequest: { Key: { pk: 'USER#user-1', sk: 'TICKET#1' } } }] } })
      .resolves({ UnprocessedItems: {} })

    const result = (await handler(eventFor('user-1'), {} as never, {} as never)) as { statusCode: number }
    expect(result.statusCode).toBe(200)
    expect(ddbMock.commandCalls(BatchWriteCommand).length).toBeGreaterThanOrEqual(2)
  })

  it('surfaces a real internal error (not a false 200) if items are still unprocessed after every retry', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'USER#user-1', sk: 'TICKET#1' }] })
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: { 'dpnr-session-tickets-test': [{ DeleteRequest: { Key: { pk: 'USER#user-1', sk: 'TICKET#1' } } }] },
    })

    const result = (await handler(eventFor('user-1'), {} as never, {} as never)) as { statusCode: number }
    expect(result.statusCode).toBe(500)
  })

  it('paginates a query with LastEvaluatedKey before batch-deleting', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({ Items: [{ pk: 'USER#user-1', sk: 'A' }], LastEvaluatedKey: { pk: 'USER#user-1', sk: 'A' } })
      .resolves({ Items: [{ pk: 'USER#user-1', sk: 'B' }] })
    ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} })

    const result = (await handler(eventFor('user-1'), {} as never, {} as never)) as { statusCode: number }
    expect(result.statusCode).toBe(200)
    // resolvesOnce fires exactly once across the whole handler (both
    // partitions share the mock queue) — 2 pages for the first partition
    // queried (session-tickets) + 1 page for the second (application) = 3.
    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(3)
  })
})
