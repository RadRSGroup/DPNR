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
  ONBOARDING_ACTIVE_DOMAIN_OPTIONS,
  ACTIVE_DOMAIN_TO_LIFE_DOMAIN,
  ONBOARDING_INTERACTION_PREFERENCE_OPTIONS,
  INTERACTION_PREFERENCE_TO_MODE,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type OnboardingActiveDomainOption,
  type OnboardingInteractionPreferenceOption,
  type LifeDomainCategory,
  type InteractionMode,
  type UpdateOnboardingSnapshotRequest,
} from '@dpnr/shared-types'

const CURRENT_STATE_OPTIONS = OnboardingCurrentStateSchema.options
const DESIRED_STATE_OPTIONS = OnboardingDesiredStateSchema.options

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

type Step = 'intro' | 'currentState' | 'activeDomains' | 'desiredStates' | 'interactionPreference' | 'intention'
const CARD_STEPS: Step[] = ['currentState', 'activeDomains', 'desiredStates', 'interactionPreference']

const OPTION_BUTTON_BASE =
  'rounded-2xl border text-sm font-medium transition-all disabled:opacity-50'
const OPTION_BUTTON_SELECTED =
  'border-[var(--color-violet-500)]/60 bg-[var(--color-violet-900)]/40 text-[var(--color-violet-300)]'
const OPTION_BUTTON_UNSELECTED = 'border-white/10 text-white/70 hover:border-white/20 hover:text-white/90'
const SKIP_BUTTON = 'w-full text-center text-white/40 hover:text-white/60 text-sm py-2 transition-colors disabled:opacity-50'

/**
 * First-Time Onboarding, Slice C (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4,
 * source spec `docs/DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf`
 * §5.6/§3 "Agency") — adds the optional `CURRENT_INTENTION` free-text step
 * after Card 4, plus a real, dedicated "Skip" affordance on every card. The
 * flow now finalizes (`completed: true`) at the intention step, matching the
 * doc's own `INTENTION_SUBMITTED_OR_SKIPPED -> Generate First Coordinates`
 * event — Slice B's shortcut of finalizing right after Card 4 is gone.
 *
 * Skip semantics: `currentState`/`interactionPreference` (single-choice
 * cards) skip by simply advancing without writing anything, leaving the
 * field `null` — same as never having answered it. `activeDomains`/
 * `desiredStates` (multi-select cards) skip by explicitly persisting an
 * empty array, distinct from Continue (which persists whatever's currently
 * selected, including zero) — Slice B already made 0-selections a valid
 * Continue outcome; this adds the dedicated, visible affordance the plan
 * doc's own "every step can be skipped" principle calls for.
 *
 * Still not built (Slice D): the First Coordinates summary screen + Yes/
 * Partly/Not quite feedback — this screen still finalizes and redirects
 * straight to `next` after the intention step, same "ship a real, non-dead-
 * ending increment" reasoning Slice A/B's own placeholders used.
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
  const [desiredStates, setDesiredStates] = useState<OnboardingDesiredState[]>([])
  const [interactionPreferenceLabel, setInteractionPreferenceLabel] =
    useState<OnboardingInteractionPreferenceOption | null>(null)
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
        setDesiredStates(snapshot.desiredStates)
        if (snapshot.interactionPreference) {
          setInteractionPreferenceLabel(MODE_TO_INTERACTION_PREFERENCE[snapshot.interactionPreference])
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
    if (await save({ activeDomains: categories })) setStep('desiredStates')
  }

  async function handleSkipActiveDomains() {
    setActiveDomainLabels([])
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
    if (await save({ interactionPreference: mode })) setStep('intention')
  }

  function handleSkipInteractionPreference() {
    setStep('intention')
  }

  async function finishOnboarding(fields: UpdateOnboardingSnapshotRequest) {
    if (await save(fields)) {
      markOnboardingCompleteLocally()
      router.push(next)
      router.refresh()
    }
  }

  async function handleIntentionContinue() {
    const trimmed = intentionText.trim()
    await finishOnboarding(trimmed ? { currentIntention: trimmed, completed: true } : { completed: true })
  }

  async function handleSkipIntention() {
    await finishOnboarding({ completed: true })
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
