import type { PostConfirmationTriggerEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Cognito post-confirmation trigger. Creates the app-level PROFILE item —
 * migration plan §10 Phase 2 / §11 workstream 1. Does NOT create the KEYS
 * item: crypto material is generated client-side and pushed via a
 * separate, explicit API call (the client never sends key inputs through
 * a Cognito trigger). Consent starts unset; the consent gate (proxy.ts
 * equivalent + the pre-token-generation trigger's claim) enforces
 * collecting it before any personal-content processing happens.
 */
export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event
  }

  const userId = event.request.userAttributes.sub
  const now = new Date().toISOString()

  const profile: UserProfileItem = {
    pk: userPk(userId),
    sk: Sk.profile(),
    userId,
    tier: 'free',
    consentedAt: null,
    consentVersion: null,
    preferredLanguage: 'en',
    betaTrialActivatedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: profile,
      // Idempotency: Cognito can retry this trigger. Never clobber an
      // existing profile (e.g. re-confirmation edge cases) with a fresh
      // default one and lose real state.
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  ).catch((err: unknown) => {
    const isConditionalCheckFailure =
      err instanceof Error && err.name === 'ConditionalCheckFailedException'
    if (!isConditionalCheckFailure) throw err
  })

  return event
}
