import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import {
  AdminLinkProviderForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import type { PreSignUpTriggerEvent } from 'aws-lambda'
import { handler } from './pre-signup'

const cognitoMock = mockClient(CognitoIdentityProviderClient)

function event(overrides: Partial<PreSignUpTriggerEvent> & { attrs?: Record<string, string> } = {}): PreSignUpTriggerEvent {
  const { attrs, ...rest } = overrides
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_pool',
    userName: 'google_1234567890',
    callerContext: { awsSdkVersion: '3', clientId: 'client' },
    triggerSource: 'PreSignUp_ExternalProvider',
    request: { userAttributes: { email: 'Person@Example.com', email_verified: 'true', ...attrs } },
    response: { autoConfirmUser: false, autoVerifyEmail: false, autoVerifyPhone: false },
    ...rest,
  } as PreSignUpTriggerEvent
}

describe('pre-signup (Google account linking)', () => {
  beforeEach(() => cognitoMock.reset())

  it('links a Google sign-in to the confirmed email/password account with the same email', async () => {
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [{ Username: 'native-uuid', UserStatus: 'CONFIRMED', Attributes: [{ Name: 'email', Value: 'person@example.com' }] }],
    })
    cognitoMock.on(AdminLinkProviderForUserCommand).resolves({})
    await handler(event())
    expect(cognitoMock.commandCalls(ListUsersCommand)[0].args[0].input.Filter).toBe('email = "person@example.com"')
    const link = cognitoMock.commandCalls(AdminLinkProviderForUserCommand)[0].args[0].input
    expect(link.DestinationUser).toEqual({ ProviderName: 'Cognito', ProviderAttributeValue: 'native-uuid' })
    expect(link.SourceUser).toEqual({ ProviderName: 'Google', ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: '1234567890' })
  })

  it('does not link when Google has not verified the email', async () => {
    await handler(event({ attrs: { email_verified: 'false' } }))
    expect(cognitoMock.commandCalls(ListUsersCommand)).toHaveLength(0)
  })

  it('does not link to an unconfirmed or already-federated account', async () => {
    cognitoMock.on(ListUsersCommand).resolves({
      Users: [
        { Username: 'pending', UserStatus: 'UNCONFIRMED', Attributes: [] },
        { Username: 'google_999', UserStatus: 'EXTERNAL_PROVIDER', Attributes: [{ Name: 'identities', Value: '[]' }] },
      ],
    })
    await handler(event())
    expect(cognitoMock.commandCalls(AdminLinkProviderForUserCommand)).toHaveLength(0)
  })

  it('passes email/password sign-ups through untouched', async () => {
    await handler(event({ triggerSource: 'PreSignUp_SignUp' }))
    expect(cognitoMock.commandCalls(ListUsersCommand)).toHaveLength(0)
  })
})
