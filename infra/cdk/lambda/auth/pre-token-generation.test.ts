import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import type { PreTokenGenerationTriggerEvent } from 'aws-lambda'
import { handler } from './pre-token-generation'

/**
 * Security review 2026-09-14 (DPNR-12) — `custom:consent` is the claim
 * ADR 0004's whole design hinges on ("read from DynamoDB directly, not a
 * duplicated Cognito attribute, to avoid a two-sources-of-truth risk").
 * `hasConsented = Boolean(profile?.consentedAt)` is a one-line condition
 * with real consequences if it's ever wrong in either direction — these
 * tests exist to pin down both directions, not just the happy path.
 */

const ddbMock = mockClient(DynamoDBDocumentClient)

function tokenEvent(userId: string): PreTokenGenerationTriggerEvent {
  return {
    request: { userAttributes: { sub: userId } },
    response: {},
  } as unknown as PreTokenGenerationTriggerEvent
}

beforeEach(() => {
  ddbMock.reset()
})

describe('Cognito pre-token-generation trigger', () => {
  it('claims consent=false for a profile with consentedAt still null', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { consentedAt: null, preferredLanguage: 'en' } })

    const result = await handler(tokenEvent('user-1'))

    expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride).toMatchObject({
      'custom:consent': 'false',
      'custom:locale': 'en',
    })
  })

  it('claims consent=true once consentedAt is a real timestamp', async () => {
    ddbMock
      .on(GetCommand)
      .resolves({ Item: { consentedAt: '2026-09-22T00:00:00.000Z', preferredLanguage: 'he' } })

    const result = await handler(tokenEvent('user-1'))

    expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride).toMatchObject({
      'custom:consent': 'true',
      'custom:locale': 'he',
    })
  })

  it('defaults every claim to its unconsented/unset form when no PROFILE item exists yet', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const result = await handler(tokenEvent('user-1'))

    expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride).toEqual({
      'custom:consent': 'false',
      'custom:locale': 'en',
      'custom:profileSetup': 'false',
      'custom:onboardingComplete': 'false',
    })
  })

  it('reads the onboarding claim from a genuinely separate item, not the profile item', async () => {
    ddbMock
      .on(GetCommand, { Key: { pk: 'USER#user-1', sk: 'PROFILE' } })
      .resolves({ Item: { consentedAt: '2026-09-22T00:00:00.000Z' } })
    ddbMock
      .on(GetCommand, { Key: { pk: 'USER#user-1', sk: 'ONBOARDING_SNAPSHOT' } })
      .resolves({ Item: { completedAt: '2026-09-22T00:00:00.000Z' } })

    const result = await handler(tokenEvent('user-1'))

    expect(result.response.claimsOverrideDetails?.claimsToAddOrOverride?.['custom:onboardingComplete']).toBe('true')
  })
})
