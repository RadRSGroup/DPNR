import { z } from 'zod'
import { LifeDomainCategorySchema } from '../dynamo/twin'
import { InteractionModeSchema } from '../dynamo/session'
import { OnboardingCurrentStateSchema, OnboardingDesiredStateSchema, OnboardingSnapshotFeedbackSchema } from '../dynamo/onboarding'

/**
 * PUT /v1/user/onboarding-snapshot — First-Time Onboarding, Slice A
 * (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4). Same "all fields optional,
 * only what's present gets written, at least one required" shape as
 * `UpdatePreferencesRequestSchema` — Slice B's four card screens will each
 * call this with just their own field(s); this slice's own placeholder
 * `/onboarding` screen calls it with only `completed: true`.
 *
 * `currentIntention` is sent/returned as plain text — the server encrypts
 * it on write (`OnboardingSnapshotItem.currentIntention` is an
 * `EncryptedBlob`) and decrypts it on read, same boundary as
 * `CreateCommitmentRequest.description`.
 *
 * `completed` (write-only, always `true` when present) marks the flow done
 * — whether via a real First Coordinates confirmation (Slice D) or this
 * slice's own placeholder screen — the same role `profileSetupComplete`
 * plays for `/profile-setup`. This is what stops `proxy.ts`'s gate from
 * showing `/onboarding` again.
 */
export const UpdateOnboardingSnapshotRequestSchema = z
  .object({
    currentState: OnboardingCurrentStateSchema.optional(),
    activeDomains: z.array(LifeDomainCategorySchema).max(3).optional(),
    desiredStates: z.array(OnboardingDesiredStateSchema).max(3).optional(),
    interactionPreference: InteractionModeSchema.optional(),
    currentIntention: z.string().optional(),
    snapshotFeedback: OnboardingSnapshotFeedbackSchema.optional(),
    completed: z.literal(true).optional(),
  })
  .refine(
    (v) =>
      v.currentState !== undefined ||
      v.activeDomains !== undefined ||
      v.desiredStates !== undefined ||
      v.interactionPreference !== undefined ||
      v.currentIntention !== undefined ||
      v.snapshotFeedback !== undefined ||
      v.completed !== undefined,
    { message: 'At least one onboarding-snapshot field is required.' }
  )
export type UpdateOnboardingSnapshotRequest = z.infer<typeof UpdateOnboardingSnapshotRequestSchema>

/**
 * Shared by the PUT (write) and GET (read) `/v1/user/onboarding-snapshot`
 * handlers — the caller's current snapshot state, decrypted, so a user who
 * leaves mid-flow and returns sees their own real prior selections rather
 * than a fabricated default (same "never fabricate a default the user
 * hasn't chosen" convention as `PreferencesResponseSchema`).
 */
export const OnboardingSnapshotResponseSchema = z.object({
  currentState: OnboardingCurrentStateSchema.nullable(),
  activeDomains: z.array(LifeDomainCategorySchema),
  desiredStates: z.array(OnboardingDesiredStateSchema),
  interactionPreference: InteractionModeSchema.nullable(),
  currentIntention: z.string().nullable(),
  snapshotFeedback: OnboardingSnapshotFeedbackSchema.nullable(),
  completedAt: z.string().nullable(),
})
export type OnboardingSnapshotResponse = z.infer<typeof OnboardingSnapshotResponseSchema>
