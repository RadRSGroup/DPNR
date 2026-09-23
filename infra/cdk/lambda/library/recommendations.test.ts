import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import { handler } from './recommendations'

/**
 * Session 65: covers the new `basis` field. The Library's Featured Today
 * features the DPNR Method until `basis === 'signals'`, so mislabelling an
 * onboarding-only ranking as 'signals' would take the method away from
 * exactly the new users it's for.
 */

vi.mock('../lib/library-catalog', () => ({
  listActiveTopics: vi.fn(async () => [
    { slug: 'control', title: 'Control', exploreTheme: 'PATTERNS', lifeDomains: [] },
    { slug: 'self-trust', title: 'Self-Trust', exploreTheme: 'ME', lifeDomains: [] },
  ]),
}))
// vi.mock factories are hoisted above the imports, so the shared mock must be too.
const { onboardingDomains } = vi.hoisted(() => ({ onboardingDomains: vi.fn(async (): Promise<string[]> => []) }))
vi.mock('../lib/onboarding-snapshot-context', () => ({
  getOnboardingActiveDomains: () => onboardingDomains(),
}))

const ddbMock = mockClient(DynamoDBDocumentClient)

const event = {
  requestContext: { authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: null } } },
} as unknown as APIGatewayProxyEventV2WithJWTAuthorizer

async function call() {
  const result = await handler(event, {} as never, {} as never)
  return JSON.parse((result as { body: string }).body)
}

beforeEach(() => {
  ddbMock.reset()
  onboardingDomains.mockReset()
  onboardingDomains.mockResolvedValue([])
})

describe('GET /v1/library/recommendations — basis', () => {
  it("is 'signals' when ranked from confirmed Twin signals", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ domain: 'pattern', status: 'confirmed' }] })
    const body = await call()
    expect(body.recommendations.map((r: { topic: { slug: string } }) => r.topic.slug)).toEqual(['control'])
    expect(body.basis).toBe('signals')
  })

  it("is 'onboarding' when only the onboarding intake is available", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] })
    onboardingDomains.mockResolvedValue(['self_inner_world'])
    const body = await call()
    expect(body.recommendations.map((r: { topic: { slug: string } }) => r.topic.slug)).toEqual(['self-trust'])
    expect(body.basis).toBe('onboarding')
  })

  it('ignores unconfirmed signals (falls back to onboarding)', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [{ domain: 'pattern', status: 'pending' }] })
    onboardingDomains.mockResolvedValue(['self_inner_world'])
    const body = await call()
    expect(body.basis).toBe('onboarding')
  })

  it('is absent when there is nothing to recommend', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] })
    const body = await call()
    expect(body.recommendations).toEqual([])
    expect(body.basis).toBeUndefined()
  })
})
