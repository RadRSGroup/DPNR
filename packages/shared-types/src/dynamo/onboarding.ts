import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'
import { LifeDomainCategorySchema } from './twin'
import { ONBOARDING_CURRENT_STATES, ONBOARDING_DESIRED_STATES, ONBOARDING_SNAPSHOT_FEEDBACK } from '../constants'
import { InteractionModeSchema } from './session'

/** Option lists and mappings live in `../constants` (Zod-free, for the web client). */
export const OnboardingCurrentStateSchema = z.enum(ONBOARDING_CURRENT_STATES)
export type OnboardingCurrentState = z.infer<typeof OnboardingCurrentStateSchema>

export const OnboardingDesiredStateSchema = z.enum(ONBOARDING_DESIRED_STATES)
export type OnboardingDesiredState = z.infer<typeof OnboardingDesiredStateSchema>

export const OnboardingSnapshotFeedbackSchema = z.enum(ONBOARDING_SNAPSHOT_FEEDBACK)
export type OnboardingSnapshotFeedback = z.infer<typeof OnboardingSnapshotFeedbackSchema>

/**
 * USER#<id> / ONBOARDING_SNAPSHOT — First-Time Onboarding's card-sequence
 * answers (`FIRST_TIME_ONBOARDING_PLAN.md` §3). Plaintext except
 * `currentIntention`: these are disposable selection inputs, not personal
 * content the way a Mirror/Decision session is — closer in kind to
 * `UserProfileItem.genderIdentity` than to an encrypted room transcript.
 * `currentIntention` is free text though, so it gets the same
 * `EncryptedBlobSchema` treatment as any other user-authored prose
 * (`ADR`-precedented "any freshly-typed personal content is encrypted"
 * rule, same as `CommitmentItem.content`).
 *
 * Deliberately NOT a second "here's what DPNR understands about you"
 * summary — `FIRST_TIME_ONBOARDING_PLAN.md` §5.2 settled that these answers
 * feed the *existing* `RoadmapItem` (dynamo/twin.ts) as richer onboarding
 * context, not a parallel `FIRST_SNAPSHOT` item. What's stored here is only
 * the raw selection inputs plus completion/feedback bookkeeping — the
 * actual "First Coordinates" summary Slice D renders is derived from these
 * fields at read time, not stored a second time.
 */
export const OnboardingSnapshotItemSchema = z.object({
  pk: z.string(),
  sk: z.literal('ONBOARDING_SNAPSHOT'),
  currentState: OnboardingCurrentStateSchema.nullable().default(null),
  activeDomains: z.array(LifeDomainCategorySchema).max(3).default([]),
  desiredStates: z.array(OnboardingDesiredStateSchema).max(3).default([]),
  interactionPreference: InteractionModeSchema.nullable().default(null),
  currentIntention: EncryptedBlobSchema.nullable().default(null),
  snapshotFeedback: OnboardingSnapshotFeedbackSchema.nullable().default(null),
  // Gates proxy.ts's one-time redirect, same role as
  // consentedAt/profileSetupCompletedAt. Set once the flow is finished —
  // whether via a real First Coordinates confirmation (Slice D) or, until
  // that exists, this slice's own placeholder screen's single Continue
  // action — never the reverse.
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type OnboardingSnapshotItem = z.infer<typeof OnboardingSnapshotItemSchema>
