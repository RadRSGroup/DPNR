'use client'
import Image from 'next/image'
import { useEffect, useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { getOnboardingSnapshot, updateOnboardingSnapshot } from '@/lib/api/v1-client'
import { markOnboardingCompleteLocally } from '@/lib/cognito/client'
import {
  OnboardingCurrentStateSchema,
  OnboardingDesiredStateSchema,
  OnboardingSnapshotFeedbackSchema,
  ONBOARDING_ACTIVE_DOMAIN_OPTIONS,
  ACTIVE_DOMAIN_TO_LIFE_DOMAIN,
  ONBOARDING_INTERACTION_PREFERENCE_OPTIONS,
  INTERACTION_PREFERENCE_TO_MODE,
  LIFE_DOMAIN_LABELS,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type OnboardingSnapshotFeedback,
  type OnboardingActiveDomainOption,
  type OnboardingInteractionPreferenceOption,
  type LifeDomainCategory,
  type InteractionMode,
  type UpdateOnboardingSnapshotRequest,
} from '@dpnr/shared-types'

const CURRENT_STATE_OPTIONS = OnboardingCurrentStateSchema.options
const DESIRED_STATE_OPTIONS = OnboardingDesiredStateSchema.options
const SNAPSHOT_FEEDBACK_OPTIONS = OnboardingSnapshotFeedbackSchema.options

/**
 * Card 4's label -> mode mapping (`INTERACTION_PREFERENCE_TO_MODE`) is a
 * bijection — 6 distinct labels, 6 distinct modes — so it's safely
 * invertible for resuming a partially-completed flow. Card 2's label ->
 * `LifeDomainCategory` mapping is NOT (several labels collapse onto the
 * same category, e.g. Love/Family/Friends -> relationships), so no
 * equivalent reverse map exists — see the resume-state effect below.
 */
const MODE_TO_INTERACTION_PREFERENCE = Object.fromEntries(
  Object.entries(INTERACTION_PREFERENCE_TO_MODE).map(([label, mode]) => [mode, label])
) as Record<InteractionMode, OnboardingInteractionPreferenceOption>

type Step =
  | 'intro'
  | 'currentState'
  | 'activeDomains'
  | 'desiredStates'
  | 'interactionPreference'
  | 'intention'
  | 'summary'
const CARD_STEPS: Step[] = ['currentState', 'activeDomains', 'desiredStates', 'interactionPreference']

const OPTION_BUTTON_BASE =
  'rounded-2xl border text-sm font-medium transition-all disabled:opacity-50'
const OPTION_BUTTON_SELECTED =
  'border-[var(--color-violet-500)]/60 bg-[var(--color-violet-900)]/40 text-[var(--color-violet-300)]'
const OPTION_BUTTON_UNSELECTED = 'border-white/10 text-white/70 hover:border-white/20 hover:text-white/90'
const SKIP_BUTTON = 'w-full text-center text-white/40 hover:text-white/60 text-sm py-2 transition-colors disabled:opacity-50'

/**
 * First-Time Onboarding, Slice D (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4,
 * source spec `docs/DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf`
 * §6/§11) — adds the First Coordinates summary screen + Yes/Partly/Not quite
 * feedback after the intention step, then hands off to Companion (the real
 * seed-context integration happens server-side, in the `companion/onboard`
 * prompt — see `infra/cdk/lambda/lib/onboarding-snapshot-context.ts`).
 *
 * **`completedAt` (which drives `custom:onboardingComplete` and thus
 * `proxy.ts`'s gate) is still set at the intention step, unchanged from
 * Slice C** — First Coordinates is shown synchronously in the same client
 * session right after that, entirely from local state, never as a
 * separately-resumable step. Deliberate, disclosed trade-off: changing the
 * gate to depend on `snapshotFeedback` instead would mean editing
 * `pre-token-generation.ts` (a backend/deploy change) and redefining what
 * Slices A-C already shipped as "complete." The accepted gap: a user who
 * closes the tab in the narrow window between finalizing and tapping a
 * feedback option will, on any future `/onboarding` visit, land directly in
 * Companion and never see First Coordinates — same order of edge case as
 * Slice B/C's own disclosed one-re-tap/one-re-visit gaps, not a new class
 * of problem.
 *
 * Tapping Yes/Partly/Not quite does double duty (`handleSnapshotFeedback`):
 * persists the choice and immediately routes to `next` — the source doc's
 * own §11 interaction table has no separate button between
 * `SNAPSHOT_FEEDBACK` and `ENTER_DPNR`, and no "revise" UI is scoped for
 * this slice (a "Not quite" answer is expected to surface naturally in the
 * Companion conversation that follows, not through a dedicated edit flow).
 *
 * Slice C's own skip/finalize semantics (see below) are unchanged by this
 * slice.
 *
 * Skip semantics: `currentState`/`interactionPreference` (single-choice
 * cards) skip by simply advancing without writing anything, leaving the
 * field `null` — same as never having answered it. `activeDomains`/
 * `desiredStates` (multi-select cards) skip by explicitly persisting an
 * empty array, distinct from Continue (which persists whatever's currently
 * selected, including zero).
 *
 * Still not built (Slice E): threading the snapshot into Library
 * recommendations / Pull-a-Card ranking for a non-empty first Companion
 * entry.
 */
function OnboardingContent() {
  const t = useTranslations('Onboarding')
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/companion'

  const [step, setStep] = useState<Step>('intro')
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentState, setCurrentState] = useState<OnboardingCurrentState | null>(null)
  const [activeDomainLabels, setActiveDomainLabels] = useState<OnboardingActiveDomainOption[]>([])
  // The actually-persisted, post-mapping value — `activeDomainLabels` above
  // is only the raw pre-map card selection. Needed for the First
  // Coordinates screen (Slice D), which displays what was really stored,
  // not the card's own transient UI state.
  const [activeDomainCategories, setActiveDomainCategories] = useState<LifeDomainCategory[]>([])
  const [desiredStates, setDesiredStates] = useState<OnboardingDesiredState[]>([])
  const [interactionPreferenceLabel, setInteractionPreferenceLabel] =
    useState<OnboardingInteractionPreferenceOption | null>(null)
  const [interactionMode, setInteractionMode] = useState<InteractionMode | null>(null)
  const [intentionText, setIntentionText] = useState('')

  // Resume mid-flow: a returning user (e.g. a reload between cards) sees
  // their own real prior selections rather than starting over, the same
  // "never fabricate a default" convention `OnboardingSnapshotResponse`
  // already documents. `activeDomains` can't be reverse-mapped to its
  // original card labels (see comment above), so that one card always
  // starts unselected even on resume — a disclosed, minor rough edge (one
  // re-tap), not a correctness bug.
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
        if (!snapshot.currentState) {
          setStep('intro')
        } else if (snapshot.activeDomains.length === 0) {
          setStep('activeDomains')
        } else if (snapshot.desiredStates.length === 0) {
          setStep('desiredStates')
        } else if (!snapshot.interactionPreference) {
          setStep('interactionPreference')
        } else if (!snapshot.completedAt) {
          // All 4 cards answered but the intention step was never reached/
          // finished (e.g. the tab closed right after Card 4) — resume there
          // rather than re-asking four already-answered questions.
          setStep('intention')
        } else {
          // Genuinely already complete (e.g. a stale claim/cookie) —
          // self-heal by leaving instead of re-showing a finished flow.
          markOnboardingCompleteLocally()
          router.push(next)
          router.refresh()
          return
        }
      } catch {
        // A fresh-snapshot fetch failing just means starting from the top —
        // not fatal, the flow still works from empty local state.
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save(fields: UpdateOnboardingSnapshotRequest): Promise<boolean> {
    setSaving(true)
    setError(null)
    try {
      await updateOnboardingSnapshot(fields)
      return true
    } catch {
      setError(t('errorGeneric'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleCurrentState(value: OnboardingCurrentState) {
    setCurrentState(value)
    if (await save({ currentState: value })) setStep('activeDomains')
  }

  function handleSkipCurrentState() {
    setStep('activeDomains')
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
    if (await save({ activeDomains: categories })) setStep('desiredStates')
  }

  async function handleSkipActiveDomains() {
    setActiveDomainLabels([])
    setActiveDomainCategories([])
    if (await save({ activeDomains: [] })) setStep('desiredStates')
  }

  function toggleDesiredState(value: OnboardingDesiredState) {
    setDesiredStates((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length >= 3 ? prev : [...prev, value]
    )
  }

  async function handleDesiredStatesContinue() {
    if (await save({ desiredStates })) setStep('interactionPreference')
  }

  async function handleSkipDesiredStates() {
    setDesiredStates([])
    if (await save({ desiredStates: [] })) setStep('interactionPreference')
  }

  async function handleInteractionPreference(label: OnboardingInteractionPreferenceOption) {
    setInteractionPreferenceLabel(label)
    const mode = INTERACTION_PREFERENCE_TO_MODE[label]
    setInteractionMode(mode)
    if (await save({ interactionPreference: mode })) setStep('intention')
  }

  function handleSkipInteractionPreference() {
    setStep('intention')
  }

  // Marks the flow `completed` (the field `proxy.ts`'s gate actually reads —
  // see this component's own doc comment for why First Coordinates is
  // deliberately NOT gated on `snapshotFeedback` instead) and moves to the
  // First Coordinates screen, entirely from local state — no re-fetch.
  async function finalizeOnboarding(fields: UpdateOnboardingSnapshotRequest) {
    if (await save(fields)) {
      markOnboardingCompleteLocally()
      setStep('summary')
    }
  }

  async function handleIntentionContinue() {
    const trimmed = intentionText.trim()
    await finalizeOnboarding(trimmed ? { currentIntention: trimmed, completed: true } : { completed: true })
  }

  async function handleSkipIntention() {
    await finalizeOnboarding({ completed: true })
  }

  // First Coordinates' Yes/Partly/Not quite (source doc §11): persists the
  // choice and routes onward in one action — the doc's own interaction
  // table has no separate confirm button between SNAPSHOT_FEEDBACK and
  // ENTER_DPNR, and no "revise" UI is scoped for this slice.
  async function handleSnapshotFeedback(feedback: OnboardingSnapshotFeedback) {
    if (await save({ snapshotFeedback: feedback })) {
      router.push(next)
      router.refresh()
    }
  }

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-tertiary)] text-sm">{t('continuing')}</p>
      </div>
    )
  }

  const cardIndex = CARD_STEPS.indexOf(step)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 pb-10 min-h-screen flex flex-col justify-center">
        <div className="text-center mb-6">
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          {cardIndex >= 0 && (
            <p className="text-[var(--color-text-tertiary)] text-xs mt-2">
              {t('progress', { step: cardIndex + 1, total: CARD_STEPS.length })}
            </p>
          )}
        </div>

        {step === 'intro' && (
          <div className="text-center">
            {/* First-Time Onboarding, video-slot follow-up
                (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §5.5): an inert
                placeholder for the real WOW VIDEO, which is developed and
                supplied separately (per the source doc) and doesn't exist
                yet — deliberately not a real <video>/player pointed at a
                nonexistent source, just a static frame that reads as
                "a video belongs here, coming soon" rather than broken
                media. Swap this for the real player once the asset lands;
                nothing else on this screen needs to change to accommodate
                it. */}
            <div className="w-full aspect-video rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 mb-6">
              <div className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/40 text-base">
                ▶
              </div>
              <p className="text-white/30 text-xs">{t('intro.videoComingSoon')}</p>
            </div>

            <h1 className="text-white text-xl font-light mb-4">{t('intro.title')}</h1>
            <p className="text-[var(--color-text-tertiary)] text-sm">{t('intro.body1')}</p>
            <p className="text-[var(--color-text-tertiary)] text-sm mt-1">{t('intro.body2')}</p>
            <p className="text-white/40 text-xs mt-4">{t('intro.body3')}</p>
            <button
              onClick={() => setStep('currentState')}
              className="w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all mt-8"
            >
              {t('intro.startButton')}
            </button>
          </div>
        )}

        {step === 'currentState' && (
          <div>
            <h2 className="text-white text-lg font-light text-center mb-5">{t('cards.currentState.prompt')}</h2>
            <div className="space-y-2">
              {CURRENT_STATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleCurrentState(option)}
                  disabled={saving}
                  className={`w-full text-start py-3.5 px-4 ${OPTION_BUTTON_BASE} ${
                    currentState === option ? `${OPTION_BUTTON_SELECTED} scale-[0.98]` : OPTION_BUTTON_UNSELECTED
                  }`}
                >
                  {t(`cards.currentState.options.${option}`)}
                </button>
              ))}
            </div>
            <button onClick={handleSkipCurrentState} disabled={saving} className={`${SKIP_BUTTON} mt-4`}>
              {t('cards.skipButton')}
            </button>
          </div>
        )}

        {step === 'activeDomains' && (
          <div>
            <h2 className="text-white text-lg font-light text-center mb-1">{t('cards.activeDomains.prompt')}</h2>
            <p className="text-white/40 text-xs text-center mb-5">{t('cards.activeDomains.hint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {ONBOARDING_ACTIVE_DOMAIN_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleActiveDomain(option)}
                  className={`py-3 px-3 ${OPTION_BUTTON_BASE} ${
                    activeDomainLabels.includes(option) ? OPTION_BUTTON_SELECTED : OPTION_BUTTON_UNSELECTED
                  }`}
                >
                  {t(`cards.activeDomains.options.${option}`)}
                </button>
              ))}
            </div>
            <button
              onClick={handleActiveDomainsContinue}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all mt-6"
            >
              {saving ? t('continuing') : t('cards.continueButton')}
            </button>
            <button onClick={handleSkipActiveDomains} disabled={saving} className={`${SKIP_BUTTON} mt-1`}>
              {t('cards.skipButton')}
            </button>
          </div>
        )}

        {step === 'desiredStates' && (
          <div>
            <h2 className="text-white text-lg font-light text-center mb-1">{t('cards.desiredStates.prompt')}</h2>
            <p className="text-white/40 text-xs text-center mb-5">{t('cards.desiredStates.hint')}</p>
            <div className="grid grid-cols-2 gap-2">
              {DESIRED_STATE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleDesiredState(option)}
                  className={`py-3 px-3 ${OPTION_BUTTON_BASE} ${
                    desiredStates.includes(option) ? OPTION_BUTTON_SELECTED : OPTION_BUTTON_UNSELECTED
                  }`}
                >
                  {t(`cards.desiredStates.options.${option}`)}
                </button>
              ))}
            </div>
            <button
              onClick={handleDesiredStatesContinue}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all mt-6"
            >
              {saving ? t('continuing') : t('cards.continueButton')}
            </button>
            <button onClick={handleSkipDesiredStates} disabled={saving} className={`${SKIP_BUTTON} mt-1`}>
              {t('cards.skipButton')}
            </button>
          </div>
        )}

        {step === 'interactionPreference' && (
          <div>
            <h2 className="text-white text-lg font-light text-center mb-5">
              {t('cards.interactionPreference.prompt')}
            </h2>
            <div className="space-y-2">
              {ONBOARDING_INTERACTION_PREFERENCE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleInteractionPreference(option)}
                  disabled={saving}
                  className={`w-full text-start py-3.5 px-4 ${OPTION_BUTTON_BASE} ${
                    interactionPreferenceLabel === option
                      ? `${OPTION_BUTTON_SELECTED} scale-[0.98]`
                      : OPTION_BUTTON_UNSELECTED
                  }`}
                >
                  {t(`cards.interactionPreference.options.${INTERACTION_PREFERENCE_TO_MODE[option]}`)}
                </button>
              ))}
            </div>
            <button onClick={handleSkipInteractionPreference} disabled={saving} className={`${SKIP_BUTTON} mt-4`}>
              {t('cards.skipButton')}
            </button>
          </div>
        )}

        {step === 'intention' && (
          <div>
            <h2 className="text-white text-lg font-light text-center mb-5">{t('cards.currentIntention.prompt')}</h2>
            <textarea
              value={intentionText}
              onChange={(e) => setIntentionText(e.target.value)}
              disabled={saving}
              rows={4}
              placeholder={t('cards.currentIntention.placeholder')}
              className="w-full rounded-2xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/30 px-4 py-3.5 focus:outline-none focus:border-[var(--color-violet-500)]/60 disabled:opacity-50 resize-none"
            />
            <button
              onClick={handleIntentionContinue}
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all mt-6"
            >
              {saving ? t('continuing') : t('cards.continueButton')}
            </button>
            <button onClick={handleSkipIntention} disabled={saving} className={`${SKIP_BUTTON} mt-1`}>
              {t('cards.currentIntention.skipButton')}
            </button>
          </div>
        )}

        {step === 'summary' && (
          <div>
            <h1 className="text-white text-xl font-light text-center mb-4">{t('summary.title')}</h1>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 space-y-4">
              {currentState && (
                <div>
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.rightNow')}</p>
                  <p className="text-white text-sm">{t(`cards.currentState.options.${currentState}`)}</p>
                </div>
              )}
              {activeDomainCategories.length > 0 && (
                <div>
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.lifeInFocus')}</p>
                  <p className="text-white text-sm">
                    {activeDomainCategories.map((d) => LIFE_DOMAIN_LABELS[d]).join(' • ')}
                  </p>
                </div>
              )}
              {desiredStates.length > 0 && (
                <div>
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.moreOf')}</p>
                  <p className="text-white text-sm">
                    {desiredStates.map((d) => t(`cards.desiredStates.options.${d}`)).join(' • ')}
                  </p>
                </div>
              )}
              {interactionMode && (
                <div>
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">
                    {t('summary.howYouExplore')}
                  </p>
                  <p className="text-white text-sm">{t(`cards.interactionPreference.options.${interactionMode}`)}</p>
                </div>
              )}
              {intentionText.trim() && (
                <div>
                  <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">
                    {t('summary.whatYouWant')}
                  </p>
                  <p className="text-white text-sm italic">&quot;{intentionText.trim()}&quot;</p>
                </div>
              )}
              {!currentState &&
                activeDomainCategories.length === 0 &&
                desiredStates.length === 0 &&
                !interactionMode &&
                !intentionText.trim() && (
                  <p className="text-white/50 text-sm text-center">{t('summary.emptyState')}</p>
                )}
            </div>

            <p className="text-white/40 text-xs text-center mt-5">{t('summary.disclaimer')}</p>
            <p className="text-white text-sm text-center mt-4">{t('summary.feedbackPrompt')}</p>
            <div className="flex gap-2 mt-3">
              {SNAPSHOT_FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSnapshotFeedback(option)}
                  disabled={saving}
                  className={`flex-1 ${OPTION_BUTTON_BASE} ${OPTION_BUTTON_UNSELECTED} py-3 text-center`}
                >
                  {t(`summary.feedback.${option}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3 mt-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <OnboardingContent />
    </Suspense>
  )
}
