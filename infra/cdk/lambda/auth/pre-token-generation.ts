import type { PreTokenGenerationTriggerEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Cognito pre-token-generation trigger. Injects `custom:consent` and
 * `custom:locale` claims so the API Gateway JWT authorizer / any handler
 * can fast-path read them without a DynamoDB read on every request
 * (migration plan §4.2, §3 card "Enforcement at the API layer";
 * `custom:locale` added docs/HEBREW_LOCALIZATION_PLAN.md Slice B).
 *
 * IMPORTANT: both claims are fast-path optimizations, not the sole source
 * of truth — they're only as fresh as the last token refresh. Every
 * handler that touches personal content, or that needs the caller's exact
 * current language for a Bedrock prompt, must still read the real
 * DynamoDB value itself (or accept the small staleness window is
 * acceptable for that specific action) rather than trusting the claim
 * blindly. Same "per-handler check completes the story" principle as
 * ownership checks (MVP_ARCHITECTURE.md §3 card) — this is the existing
 * `custom:consent` design note, extended to the new claim rather than
 * re-litigated, since nothing about the trust model changes.
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
      'custom:locale': profile?.preferredLanguage ?? 'en',
    },
  }

  return event
}
