import type { PreTokenGenerationTriggerEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Cognito pre-token-generation trigger. Injects a `custom:consent` claim
 * so the API Gateway JWT authorizer can fast-path reject unconsented
 * calls without a DynamoDB read on every request (migration plan §4.2,
 * §3 card "Enforcement at the API layer").
 *
 * IMPORTANT: this claim is a fast-path optimization, not the sole
 * enforcement boundary — it's only as fresh as the last token refresh.
 * Every handler that touches personal content must still check consent
 * state itself (or accept the small staleness window is acceptable for
 * that specific action) rather than trusting the claim blindly for
 * anything sensitive. Same "per-handler check completes the story"
 * principle as ownership checks (MVP_ARCHITECTURE.md §3 card).
 */
export const handler = async (
  event: PreTokenGenerationTriggerEvent
): Promise<PreTokenGenerationTriggerEvent> => {
  const userId = event.request.userAttributes.sub

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: userPk(userId), sk: Sk.profile() },
    })
  )
  const profile = result.Item as UserProfileItem | undefined
  const hasConsented = Boolean(profile?.consentedAt)

  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      'custom:consent': hasConsented ? 'true' : 'false',
    },
  }

  return event
}
