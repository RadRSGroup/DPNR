import type { PreSignUpTriggerEvent } from 'aws-lambda'
import {
  AdminLinkProviderForUserCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider'

const cognito = new CognitoIdentityProviderClient({})

/** Cognito's lowercased username prefix -> the identity provider's name in the pool. */
const PROVIDER_NAMES: Record<string, string> = { google: 'Google' }

/**
 * Pre sign-up trigger (Session 83, Google sign-in). When someone signs in
 * with Google for the first time and an email/password account with the
 * same verified email already exists, link the Google identity to that
 * account instead of creating a second one: the person keeps the same
 * `sub`, so their data, keys and credits stay theirs.
 *
 * Only links when Google says the email is verified and the existing
 * account is confirmed; otherwise it does nothing and Cognito creates a
 * separate Google-only user. Email/password sign-ups pass straight through.
 *
 * Cognito quirk: the sign-in that performs the link fails once with
 * "Already found an entry for username"; the next attempt signs in as the
 * linked account. The web callback retries once automatically.
 */
export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  if (event.triggerSource !== 'PreSignUp_ExternalProvider') return event

  const email = event.request.userAttributes.email?.toLowerCase()
  if (!email || event.request.userAttributes.email_verified !== 'true') return event

  const separator = event.userName.indexOf('_')
  const providerName = PROVIDER_NAMES[event.userName.slice(0, separator).toLowerCase()]
  const providerUserId = event.userName.slice(separator + 1)
  if (separator <= 0 || !providerName || !providerUserId) return event

  const existing = await cognito.send(
    new ListUsersCommand({
      UserPoolId: event.userPoolId,
      Filter: `email = "${email.replace(/"/g, '')}"`,
      Limit: 10,
    }),
  )
  const nativeUser = (existing.Users ?? []).find(
    (u) =>
      u.UserStatus === 'CONFIRMED' &&
      !(u.Attributes ?? []).some((a) => a.Name === 'identities'),
  )
  if (!nativeUser?.Username) return event

  await cognito.send(
    new AdminLinkProviderForUserCommand({
      UserPoolId: event.userPoolId,
      DestinationUser: { ProviderName: 'Cognito', ProviderAttributeValue: nativeUser.Username },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
    }),
  )
  return event
}
