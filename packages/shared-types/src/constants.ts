import type { InteractionMode } from './dynamo/session'

/*
 * Plain values shared by the API and the web client, with NO runtime imports
 * (type-only imports are erased). The web client imports them from
 * `@dpnr/shared-types/constants`: the package root is a CommonJS barrel, so
 * importing even one constant from it ships every schema plus Zod
 * (~61 KB brotli) to the browser. The schemas that need these values import
 * them from here; the root barrel re-exports them unchanged.
 */

/**
 * Cost per billable action — the user's own confirmed decision (Session 18).
 * Lives here (not just in `infra/cdk/lambda/lib/credits.ts`) so the frontend
 * can show the real charge (e.g. Mirror Room's "1 credit" badge) without a
 * second, driftable copy of the number.
 */
export const ROOM_REFINE_COST = 1
export const COMPANION_MESSAGE_COST = 1

/**
 * One-time credit rewards for the two non-gamified "Earn More Credits" tiles
 * (Slice 6, My Wallet — `docs/AGENT_LOG.md`). Amounts are this session's own
 * first-draft choice, not sourced from a product decision — flag for review
 * the same way Slice 3's domain→taxonomy mapping was. Deliberately excludes
 * "Daily Check-in"/"Practice Streak" (streak-shaped, dropped per the
 * project's gamification decision), so only these two exist.
 */
export const EARN_COMMITMENT_COMPLETED_CREDITS = 2
export const EARN_REFLECTION_COMPLETED_CREDITS = 1

/** Limits shared by the API and the UI. */
export const RITUAL_TEXT_MAX = 280
export const RITUALS_MAX = 30
export const JOURNAL_TITLE_MAX = 120
export const JOURNAL_BODY_MAX = 20000
export const JOURNAL_PAGE_SIZE = 20

/** Session 70 — the profile's `firstName` cap. */
export const PREFERRED_NAME_MAX_LENGTH = 40

/**
 * Life Domains taxonomy — the Intelligence Spec's 8 (§4), in the spec's
 * order. Replaced the original 7 in Session 83; mapping and migration in
 * `docs/LIFE_DOMAINS_MIGRATION.md`.
 */
export const LIFE_DOMAIN_IDS = [
  'self_inner_world',
  'relationships',
  'health_body',
  'work_purpose',
  'money_abundance',
  'growth_expansion',
  'home_lifestyle',
  'meaning_spirituality',
] as const
export type LifeDomainCategory = (typeof LIFE_DOMAIN_IDS)[number]

export const LIFE_DOMAIN_LABELS: Record<LifeDomainCategory, string> = {
  self_inner_world: 'Self & Inner World',
  relationships: 'Relationships & Connection',
  health_body: 'Health & Body',
  work_purpose: 'Work, Purpose & Contribution',
  money_abundance: 'Money & Abundance',
  growth_expansion: 'Growth & Expansion',
  home_lifestyle: 'Home & Lifestyle',
  meaning_spirituality: 'Meaning & Spirituality',
}

/** Archetype taxonomy (Session 19) — same reference, "Leading Archetypes". `ArchetypeSchema` is built from it. */
export const ARCHETYPE_IDS = ['healer', 'seeker', 'visionary', 'protector'] as const

/**
 * First-Time Onboarding, Slice A (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §3/§4,
 * source spec `docs/reference-screens/platform_photos/DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf`
 * §5.2 "Card 1 — Current State"). Verbatim from the doc — no existing
 * equivalent anywhere in the schema (checked `TwinSignalDomainSchema`,
 * Decision Room's free-text `values_needs_tags`/`fear_desire_tags` prompts —
 * neither is a fixed enum), so this ships as a new, small, literal enum
 * rather than reusing something that doesn't really fit. The doc's own
 * seventh option, "Something else…", is stored as a plain enum value here —
 * any elaboration on it belongs in the separate `currentIntention` free-text
 * field, not a second free-text slot on this one. `OnboardingCurrentStateSchema` is built from it.
 */
export const ONBOARDING_CURRENT_STATES = [
  'growing',
  'changing',
  'figuring_things_out',
  'pretty_good',
  'stuck_somewhere',
  'a_lot_right_now',
  'something_else',
] as const

/**
 * DESIRED_STATES (doc §5.4 "Card 3 — More Of"), verbatim — same
 * no-existing-equivalent reasoning as `ONBOARDING_CURRENT_STATES` above.
 * `OnboardingDesiredStateSchema` is built from it.
 */
export const ONBOARDING_DESIRED_STATES = [
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
] as const

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
 * (Love/Family/Friends -> relationships, Work/Purpose -> work_purpose) —
 * expected, not a bug, and already the plan doc's own example. Growth and
 * Fun moved to the spec's own domains in Session 83
 * (`docs/LIFE_DOMAINS_MIGRATION.md`): Growth -> growth_expansion, Fun ->
 * home_lifestyle (the spec lists recreation there).
 */
export const ACTIVE_DOMAIN_TO_LIFE_DOMAIN: Record<OnboardingActiveDomainOption, LifeDomainCategory> = {
  Me: 'self_inner_world',
  Love: 'relationships',
  Family: 'relationships',
  Friends: 'relationships',
  Work: 'work_purpose',
  Money: 'money_abundance',
  Body: 'health_body',
  Growth: 'growth_expansion',
  Purpose: 'work_purpose',
  Fun: 'home_lifestyle',
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

/** `OnboardingSnapshotFeedbackSchema` is built from it. */
export const ONBOARDING_SNAPSHOT_FEEDBACK = ['yes', 'partly', 'not_quite'] as const

/**
 * Growth Tracker's monthly window: confirmed signals created in the current
 * calendar month (UTC). Shared by dashboard/handler.ts (the three counts)
 * and the Growth page (the lists behind them) so the two can't drift apart.
 * A signal without `createdAt` is left out.
 */
export function confirmedThisMonth<T extends { status: string; createdAt?: string }>(signals: T[], now: Date = new Date()): T[] {
  const monthStart = `${now.toISOString().slice(0, 7)}-01`
  return signals.filter((s) => s.status === 'confirmed' && s.createdAt != null && s.createdAt.slice(0, 10) >= monthStart)
}
