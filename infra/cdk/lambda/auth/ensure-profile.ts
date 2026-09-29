import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem } from '@dpnr/shared-types'
import { grantCredits } from '../lib/credits'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

// Beta Trial starter grant (MVP_ARCHITECTURE.md §5.6). No spec section pins
// down a real number — this is a placeholder default, not a confirmed
// product decision; whoever wires real pricing/plans should revisit it
// (ideally sourced from a "beta_trial" PlanItem in the Plans catalog
// instead of a hardcoded constant, once one exists).
const STARTER_TRIAL_CREDITS = 50

/**
 * Creates the app-level PROFILE item (and the one-time starter credits) for
 * a Cognito user if it doesn't exist yet. Idempotent: an existing profile is
 * never overwritten, and credits are granted only when this call created it.
 * Used by post-confirmation (email sign-up) and pre-token-generation (a
 * Google sign-in creates the user without a confirmation step, Session 83).
 */
export async function ensureProfile(userId: string): Promise<boolean> {
  const pk = userPk(userId)
  const now = new Date().toISOString()

  const profile: UserProfileItem = {
    pk,
    sk: Sk.profile(),
    userId,
    tier: 'free',
    consentedAt: null,
    consentVersion: null,
    ageConfirmedAt: null,
    preferredLanguage: 'en',
    // Real gender-collection UI + its update endpoint are Slice B work
    // (docs/HEBREW_LOCALIZATION_PLAN.md) — Cognito custom attributes can't
    // be added to an already-live User Pool without recreating it, so this
    // has to be set via a profile-update API call after signup, same as
    // `preferredLanguage` will be. Defaults to 'unspecified' until then.
    genderIdentity: 'unspecified',
    // Asked on the profile-setup screen (Session 70).
    firstName: null,
    avatarKey: null,
    // Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1) — matches
    // `UserProfileItemSchema`'s own default; no upload endpoint exists yet
    // for a `custom` background, so `chatBackgroundKey` starts unset.
    chatBackground: 'digital_twin',
    chatBackgroundKey: null,
    // Set for real via `PUT /v1/user/preferences`'s `profileSetupComplete`
    // once the dedicated post-signin profile-setup screen is completed or
    // skipped (Session 51) — `null` here is what gates proxy.ts's
    // one-time redirect to that screen.
    profileSetupCompletedAt: null,
    betaTrialActivatedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  let createdProfile = true
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
    createdProfile = false
  })

  if (createdProfile) {
    await grantCredits(ddb, TABLE_NAME, pk, STARTER_TRIAL_CREDITS, 'grant_trial', 'beta_trial_signup')
  }

  return createdProfile
}
