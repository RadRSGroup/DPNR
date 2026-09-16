import { useEffect, useState } from 'react'
import { getOnboardingSnapshot, updateOnboardingSnapshot } from '@/lib/api/v1-client'
import { markOnboardingCompleteLocally } from '@/lib/cognito/client'
import {
  ACTIVE_DOMAIN_TO_LIFE_DOMAIN,
  INTERACTION_PREFERENCE_TO_MODE,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type OnboardingSnapshotFeedback,
  type OnboardingActiveDomainOption,
  type OnboardingInteractionPreferenceOption,
  type LifeDomainCategory,
  type InteractionMode,
  type UpdateOnboardingSnapshotRequest,
} from '@dpnr/shared-types'

const MODE_TO_INTERACTION_PREFERENCE = Object.fromEntries(
  Object.entries(INTERACTION_PREFERENCE_TO_MODE).map(([label, mode]) => [mode, label])
) as Record<InteractionMode, OnboardingInteractionPreferenceOption>

export type CardStep = 'currentState' | 'activeDomains' | 'desiredStates' | 'interactionPreference'
const CARD_STEPS: CardStep[] = ['currentState', 'activeDomains', 'desiredStates', 'interactionPreference']

/**
 * First-Time Onboarding, moved in-chat (docs/FIRST_TIME_ONBOARDING_PLAN.md
 * §5.6 revisited at the user's request, 2026-09-16 — the reference
 * screenshot always showed this rendered inside Main Chat's own
 * conversation area, not a standalone route; the original build accepted
 * the dedicated-`/onboarding`-route shape as a fidelity tradeoff for lower
 * effort, and this hook is that decision reversed). Owns exactly the state
 * and persistence logic the old `/onboarding` page had for its four
 * tap-to-choose cards, minus the video/Start intro screen (the reference
 * shows cards immediately under the greeting bubble, no separate tap-to-
 * start step) and minus the free-text `currentIntention` step, which now
 * reuses Main Chat's own composer instead of a dedicated textarea — see
 * `submitIntention`/`skipIntention` below and the source doc's own framing:
 * that answer can "naturally become the first conversation."
 *
 * All persistence (`getOnboardingSnapshot`/`updateOnboardingSnapshot`,
 * `custom:onboardingComplete` gating) is unchanged from the original build —
 * only the UI's location and the intention step's input surface moved.
 */
export function useOnboardingFlow() {
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(false)
  const [cardStep, setCardStep] = useState<CardStep | null>(null)
  const [awaitingIntention, setAwaitingIntention] = useState(false)
  const [showingSummary, setShowingSummary] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentState, setCurrentState] = useState<OnboardingCurrentState | null>(null)
  const [activeDomainLabels, setActiveDomainLabels] = useState<OnboardingActiveDomainOption[]>([])
  const [activeDomainCategories, setActiveDomainCategories] = useState<LifeDomainCategory[]>([])
  const [desiredStates, setDesiredStates] = useState<OnboardingDesiredState[]>([])
  const [interactionPreferenceLabel, setInteractionPreferenceLabel] =
    useState<OnboardingInteractionPreferenceOption | null>(null)
  const [interactionMode, setInteractionMode] = useState<InteractionMode | null>(null)
  const [intentionText, setIntentionText] = useState('')

  // Resume mid-flow, same rules the old `/onboarding` page used (a reload
  // between cards, or between Card 4 and the intention step, sees real
  // prior answers rather than starting over). `activeDomains` still can't
  // be reverse-mapped to its original card labels (several labels collapse
  // onto one category), so that one card always starts unselected on
  // resume — same disclosed rough edge as before, not new here.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const snapshot = await getOnboardingSnapshot()
        if (cancelled) return
        setCurrentState(snapshot.currentState)
        setActiveDomainCategories(snapshot.activeDomains)
        setDesiredStates(snapshot.desiredStates)
        if (snapshot.interactionPreference) {
          setInteractionPreferenceLabel(MODE_TO_INTERACTION_PREFERENCE[snapshot.interactionPreference])
          setInteractionMode(snapshot.interactionPreference)
        }
        if (snapshot.completedAt) {
          // Already complete — including the disclosed edge case where the
          // tab closed between finalizing and tapping a feedback option;
          // same self-heal the old page did, by simply not activating.
          setActive(false)
        } else if (!snapshot.currentState) {
          setActive(true)
          setCardStep('currentState')
        } else if (snapshot.activeDomains.length === 0) {
          setActive(true)
          setCardStep('activeDomains')
        } else if (snapshot.desiredStates.length === 0) {
          setActive(true)
          setCardStep('desiredStates')
        } else if (!snapshot.interactionPreference) {
          setActive(true)
          setCardStep('interactionPreference')
        } else {
          setActive(true)
          setCardStep(null)
          setAwaitingIntention(true)
        }
      } catch {
        // A fresh-snapshot fetch failing just means starting from the top —
        // not fatal, the flow still works from empty local state.
        setActive(true)
        setCardStep('currentState')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function save(fields: UpdateOnboardingSnapshotRequest): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      await updateOnboardingSnapshot(fields)
      return true
    } catch {
      setError('Something went wrong. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleCurrentState(value: OnboardingCurrentState) {
    setCurrentState(value)
    if (await save({ currentState: value })) setCardStep('activeDomains')
  }
  function handleSkipCurrentState() {
    setCardStep('activeDomains')
  }

  function toggleActiveDomain(label: OnboardingActiveDomainOption) {
    setActiveDomainLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : prev.length >= 3 ? prev : [...prev, label]
    )
  }
  async function handleActiveDomainsContinue() {
    const categories = Array.from(
      new Set(activeDomainLabels.map((label) => ACTIVE_DOMAIN_TO_LIFE_DOMAIN[label]))
    ) as LifeDomainCategory[]
    setActiveDomainCategories(categories)
    if (await save({ activeDomains: categories })) setCardStep('desiredStates')
  }
  async function handleSkipActiveDomains() {
    setActiveDomainLabels([])
    setActiveDomainCategories([])
    if (await save({ activeDomains: [] })) setCardStep('desiredStates')
  }

  function toggleDesiredState(value: OnboardingDesiredState) {
    setDesiredStates((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length >= 3 ? prev : [...prev, value]
    )
  }
  async function handleDesiredStatesContinue() {
    if (await save({ desiredStates })) setCardStep('interactionPreference')
  }
  async function handleSkipDesiredStates() {
    setDesiredStates([])
    if (await save({ desiredStates: [] })) setCardStep('interactionPreference')
  }

  async function handleInteractionPreference(label: OnboardingInteractionPreferenceOption) {
    setInteractionPreferenceLabel(label)
    const mode = INTERACTION_PREFERENCE_TO_MODE[label]
    setInteractionMode(mode)
    if (await save({ interactionPreference: mode })) {
      setCardStep(null)
      setAwaitingIntention(true)
    }
  }
  function handleSkipInteractionPreference() {
    setCardStep(null)
    setAwaitingIntention(true)
  }

  // Marks the flow `completed` (the field `proxy.ts`'s gate actually
  // reads) and moves to the First Coordinates summary, entirely from local
  // state — no re-fetch. Unchanged from the old page's `finalizeOnboarding`.
  async function finalize(fields: UpdateOnboardingSnapshotRequest) {
    if (await save(fields)) {
      markOnboardingCompleteLocally()
      setAwaitingIntention(false)
      setShowingSummary(true)
    }
  }

  /** Composer's Send, while `awaitingIntention` — the text becomes both the answer and the visible first chat turn. */
  async function submitIntention(text: string) {
    const trimmed = text.trim()
    setIntentionText(trimmed)
    await finalize(trimmed ? { currentIntention: trimmed, completed: true } : { completed: true })
  }
  async function skipIntention() {
    await finalize({ completed: true })
  }

  // First Coordinates' Yes/Partly/Not quite (source doc §11): persists the
  // choice and ends the flow in one action, same as the old page — no
  // separate confirm button, no "revise" UI scoped for this slice.
  async function handleSnapshotFeedback(feedback: OnboardingSnapshotFeedback): Promise<boolean> {
    if (await save({ snapshotFeedback: feedback })) {
      setShowingSummary(false)
      setActive(false)
      return true
    }
    return false
  }

  return {
    loading,
    active,
    cardStep,
    cardIndex: cardStep ? CARD_STEPS.indexOf(cardStep) : -1,
    cardTotal: CARD_STEPS.length,
    awaitingIntention,
    showingSummary,
    saving,
    error,
    currentState,
    activeDomainLabels,
    activeDomainCategories,
    desiredStates,
    interactionPreferenceLabel,
    interactionMode,
    intentionText,
    handleCurrentState,
    handleSkipCurrentState,
    toggleActiveDomain,
    handleActiveDomainsContinue,
    handleSkipActiveDomains,
    toggleDesiredState,
    handleDesiredStatesContinue,
    handleSkipDesiredStates,
    handleInteractionPreference,
    handleSkipInteractionPreference,
    submitIntention,
    skipIntention,
    handleSnapshotFeedback,
  }
}
