import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'
import { HttpError } from './http'

/**
 * Consent gate for handlers that process personal content (spec §8 launch
 * blocker: "collecting consent before any personal-content processing
 * happens"). Reads the PROFILE item directly rather than trusting the
 * JWT's `custom:consent` claim alone — that claim is documented as a
 * fast-path optimization for the API Gateway authorizer, not the sole
 * enforcement boundary (ADR 0004), and is only as fresh as the last token
 * refresh. Companion message handling calls a model on freshly-typed
 * personal content, which is exactly the "consent-sensitive" case ADR
 * 0004 says shouldn't rely on the claim alone.
 *
 * Pure read endpoints over a user's own already-stored data (Dashboard,
 * Companion context) do NOT call this — reading your own existing data
 * back to you isn't "processing" in the sense the consent gate targets.
 */
export async function requireConsent(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  userId: string
): Promise<UserProfileItem> {
  const result = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { pk: userPk(userId), sk: Sk.profile() } })
  )
  const profile = result.Item as UserProfileItem | undefined
  if (!profile) {
    throw new HttpError(404, 'profile_not_found', 'User profile does not exist.')
  }
  if (!profile.consentedAt) {
    throw new HttpError(403, 'consent_required', 'Consent must be given before this action.')
  }
  return profile
}
