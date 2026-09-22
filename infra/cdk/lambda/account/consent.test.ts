import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { CURRENT_CONSENT_VERSION } from '@dpnr/shared-types'
import { handler } from './consent'

/**
 * Security review 2026-09-14 (DPNR-12) — first committed test for this
 * handler. ADR 0004 named this exact write path as the thing that made
 * the consent gate satisfiable for a real user; PHASE_AUDIT.md §2.2/§4.1/
 * §4.2 is the incident this existed to close (Session 7 part 2) — a
 * regression here silently breaks consent for every new signup again.
 */

const ddbMock = mockClient(DynamoDBDocumentClient)

function eventFor(userId: string | undefined): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      authorizer: { jwt: { claims: userId ? { sub: userId } : {}, scopes: null } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer
}

beforeEach(() => {
  ddbMock.reset()
})

describe('POST /v1/user/consent', () => {
  it('sets consentedAt/consentVersion on the caller\'s own profile', async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { consentedAt: '2026-09-22T00:00:00.000Z', consentVersion: CURRENT_CONSENT_VERSION },
    })

    const result = await handler(eventFor('user-1'), {} as never, {} as never)
    expect(result).toBeDefined()
    const body = JSON.parse((result as { body: string }).body)
    expect(body.consentedAt).toBe('2026-09-22T00:00:00.000Z')
    expect(body.consentVersion).toBe(CURRENT_CONSENT_VERSION)

    const call = ddbMock.commandCalls(UpdateCommand)[0]
    expect(call.args[0].input.Key).toEqual({ pk: 'USER#user-1', sk: 'PROFILE' })
    expect(call.args[0].input.ConditionExpression).toBe('attribute_exists(pk)')
  })

  it('is idempotent — calling it twice does not error', async () => {
    ddbMock.on(UpdateCommand).resolves({
      Attributes: { consentedAt: '2026-09-22T00:00:00.000Z', consentVersion: CURRENT_CONSENT_VERSION },
    })

    const first = await handler(eventFor('user-1'), {} as never, {} as never)
    const second = await handler(eventFor('user-1'), {} as never, {} as never)
    expect((first as { statusCode: number }).statusCode).toBe(200)
    expect((second as { statusCode: number }).statusCode).toBe(200)
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(2)
  })

  it('404s with profile_not_found when no PROFILE item exists yet', async () => {
    const error = new Error('The conditional request failed')
    error.name = 'ConditionalCheckFailedException'
    ddbMock.on(UpdateCommand).rejects(error)

    const result = (await handler(eventFor('user-1'), {} as never, {} as never)) as {
      statusCode: number
      body: string
    }
    expect(result.statusCode).toBe(404)
    expect(JSON.parse(result.body).error.code).toBe('profile_not_found')
  })

  it('401s when the authorizer claims carry no sub — never falls through to a DynamoDB write', async () => {
    const result = (await handler(eventFor(undefined), {} as never, {} as never)) as {
      statusCode: number
      body: string
    }
    expect(result.statusCode).toBe(401)
    expect(JSON.parse(result.body).error.code).toBe('unauthenticated')
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })
})
