import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'
import { LifeDomainCategorySchema, type LifeDomainCategory } from './twin'
import { InteractionModeSchema, type InteractionMode } from './session'

/**
 * First-Time Onboarding, Slice A (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §3/§4,
 * source spec `docs/DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf`
 * §5.2 "Card 1 — Current State"). Verbatim from the doc — no existing
 * equivalent anywhere in the schema (checked `TwinSignalDomainSchema`,
 * Decision Room's free-text `values_needs_tags`/`fear_desire_tags` prompts —
 * neither is a fixed enum), so this ships as a new, small, literal enum
 * rather than reusing something that doesn't really fit. The doc's own
 * seventh option, "Something else…", is stored as a plain enum value here —
 * any elaboration on it belongs in the separate `currentIntention` free-text
 * field, not a second free-text slot on this one.
 */
export const OnboardingCurrentStateSchema = z.enum([
  'growing',
  'changing',
  'figuring_things_out',
  'pretty_good',
  'stuck_somewhere',
  'a_lot_right_now',
  'something_else',
])
export type OnboardingCurrentState = z.infer<typeof OnboardingCurrentStateSchema>

/**
 * DESIRED_STATES (doc §5.4 "Card 3 — More Of"), verbatim — same
 * no-existing-equivalent reasoning as `OnboardingCurrentStateSchema` above.
 */
export const OnboardingDesiredStateSchema = z.enum([
  'clarity',
  'peace',
  'energy',
  'connection',
  'confidence',
  'freedom',
  'direction',
  'fun',
  'courage',
  'space',
])
export type OnboardingDesiredState = z.infer<typeof OnboardingDesiredStateSchema>

/**
 * ACTIVE_DOMAINS (doc §5.3 "Card 2 — Life in Focus"), the doc's own 10
 * card-label options — kept only as a typed option list for Slice B's card
 * UI to render; never stored verbatim (see `ACTIVE_DOMAIN_TO_LIFE_DOMAIN`
 * below and `OnboardingSnapshotItemSchema.activeDomains`).
 */
export const ONBOARDING_ACTIVE_DOMAIN_OPTIONS = [
  'Me', 'Love', 'Family', 'Friends', 'Work', 'Money', 'Body', 'Growth', 'Purpose', 'Fun',
] as const
export type OnboardingActiveDomainOption = (typeof ONBOARDING_ACTIVE_DOMAIN_OPTIONS)[number]

/**
 * ACTIVE_DOMAINS -> the existing, reused `LifeDomainCategorySchema`
 * (dynamo/twin.ts), per `FIRST_TIME_ONBOARDING_PLAN.md` §3/§5.3 — not the
 * doc's own 10-value list, to avoid a 4th/5th independent life-domain
 * taxonomy on top of the three already flagged as unreconciled tech debt
 * (`docs/AGENT_LOG.md` Sessions 45/46, `INTELLIGENCE_SPEC_AUDIT.md` §4).
 * Several source options collapse onto the same category
 * (Love/Family/Friends -> relationships, Work/Purpose -> career_purpose) —
 * expected, not a bug, and already the plan doc's own example.
 *
 * Two of the ten had no clean fit and the plan doc left them explicitly
 * open ("resolve during Slice B, not here" for Growth; "no clean home in
 * any of the 7" for Fun) — but the same doc's Slice A description names
 * finalizing the ambiguous cases as in-scope for *this* slice, so they're
 * resolved here rather than carried forward again. Both are small,
 * reversible taxonomy calls (same authority level as Session 24's Library
 * domain mapping or Session 46's Pull-a-Card `lifeDomain` mapping, both
 * self-authored without a user round-trip), not product decisions needing
 * the user's own sign-off:
 * - `Growth` -> `self_inner_world` (personal-development framing, same
 *   bucket as `Me`).
 * - `Fun` -> `creativity_expression` (closest available bucket — no
 *   category in the reused 7-value taxonomy actually covers leisure/fun on
 *   its own; flagged here rather than silently guessed).
 */
export const ACTIVE_DOMAIN_TO_LIFE_DOMAIN: Record<OnboardingActiveDomainOption, LifeDomainCategory> = {
  Me: 'self_inner_world',
  Love: 'relationships',
  Family: 'relationships',
  Friends: 'relationships',
  Work: 'career_purpose',
  Money: 'money_abundance',
  Body: 'health_body',
  Growth: 'self_inner_world',
  Purpose: 'career_purpose',
  Fun: 'creativity_expression',
}

/**
 * INTERACTION_PREFERENCE (doc §5.5 "Card 4 — How Should I Meet You?") — the
 * doc's own 6 card-label options, kept as a typed option list for the same
 * reason as `ONBOARDING_ACTIVE_DOMAIN_OPTIONS` above.
 */
export const ONBOARDING_INTERACTION_PREFERENCE_OPTIONS = [
  'Help me understand it',
  'Give me perspective',
  'Ask me the right question',
  'Help me make a move',
  'Just give me space to talk',
  'Depends on the moment',
] as const
export type OnboardingInteractionPreferenceOption = (typeof ONBOARDING_INTERACTION_PREFERENCE_OPTIONS)[number]

/**
 * INTERACTION_PREFERENCE -> the existing, reused `InteractionModeSchema`
 * (dynamo/session.ts) — fully specified by the plan doc's own §3 mapping,
 * no ambiguous case here. `share`/`decide`/`regulate` are simply never
 * chosen directly at onboarding; still reachable later via the existing
 * per-turn classifier (`classify_interaction_mode`).
 */
export const INTERACTION_PREFERENCE_TO_MODE: Record<OnboardingInteractionPreferenceOption, InteractionMode> = {
  'Help me understand it': 'understand',
  'Give me perspective': 'explore_pattern',
  'Ask me the right question': 'learn',
  'Help me make a move': 'act',
  'Just give me space to talk': 'be_heard',
  'Depends on the moment': 'unknown',
}

export const OnboardingSnapshotFeedbackSchema = z.enum(['yes', 'partly', 'not_quite'])
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
