import type { PreTokenGenerationTriggerEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Cognito pre-token-generation trigger. Injects `custom:consent`,
 * `custom:locale`, `custom:profileSetup`, and `custom:onboardingComplete`
 * claims so the API Gateway JWT authorizer / any handler (and, for
 * `profileSetup`/`onboardingComplete`, `proxy.ts`'s UX gate) can fast-path
 * read them without a DynamoDB read on every request (migration plan §4.2,
 * §3 card "Enforcement at the API layer"; `custom:locale` added
 * docs/HEBREW_LOCALIZATION_PLAN.md Slice B; `custom:profileSetup` added
 * Session 51 for the post-signin profile-setup screen gate;
 * `custom:onboardingComplete` added First-Time Onboarding Slice A
 * (docs/FIRST_TIME_ONBOARDING_PLAN.md §4) — same precedent as the others,
 * not a new pattern).
 *
 * IMPORTANT: every claim here is a fast-path optimization, not the sole
 * source of truth — they're only as fresh as the last token refresh. Every
 * handler that touches personal content, or that needs the caller's exact
 * current language for a Bedrock prompt, must still read the real
 * DynamoDB value itself (or accept the small staleness window is
 * acceptable for that specific action) rather than trusting the claim
 * blindly. Same "per-handler check completes the story" principle as
 * ownership checks (MVP_ARCHITECTURE.md §3 card) — this is the existing
 * `custom:consent` design note, extended to each new claim rather than
 * re-litigated, since nothing about the trust model changes.
 *
 * `onboardingComplete` reads a second, genuinely separate item
 * (`ONBOARDING_SNAPSHOT`, not `PROFILE`) — per
 * `FIRST_TIME_ONBOARDING_PLAN.md` §3, `completedAt` deliberately lives on
 * its own item rather than being folded onto `UserProfileItem` the way
 * `profileSetupCompletedAt` was, so this trigger does two GetItems instead
 * of reusing the first one. Negligible added cost, and correctness (reading
 * the field that actually exists) wins over reusing the single-read shape
 * the other three claims share.
 */
export const handler = async (
  event: PreTokenGenerationTriggerEvent
): Promise<PreTokenGenerationTriggerEvent> => {
  const userId = event.request.userAttributes.sub

  const [profileResult, onboardingResult] = await Promise.all([
    ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: userPk(userId), sk: Sk.profile() },
      })
    ),
    ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: userPk(userId), sk: Sk.onboardingSnapshot() },
      })
    ),
  ])
  const profile = profileResult.Item as UserProfileItem | undefined
  const onboarding = onboardingResult.Item as { completedAt?: string | null } | undefined
  const hasConsented = Boolean(profile?.consentedAt)

  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      'custom:consent': hasConsented ? 'true' : 'false',
      'custom:locale': profile?.preferredLanguage ?? 'en',
      'custom:profileSetup': profile?.profileSetupCompletedAt ? 'true' : 'false',
      'custom:onboardingComplete': onboarding?.completedAt ? 'true' : 'false',
    },
  }

  return event
}
