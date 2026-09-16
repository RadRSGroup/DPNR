import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import {
  OnboardingCurrentStateSchema,
  OnboardingDesiredStateSchema,
  ONBOARDING_ACTIVE_DOMAIN_OPTIONS,
  ONBOARDING_INTERACTION_PREFERENCE_OPTIONS,
  INTERACTION_PREFERENCE_TO_MODE,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type OnboardingActiveDomainOption,
  type OnboardingInteractionPreferenceOption,
} from '@dpnr/shared-types'
import type { CardStep } from './useOnboardingFlow'

const CURRENT_STATE_OPTIONS = OnboardingCurrentStateSchema.options
const DESIRED_STATE_OPTIONS = OnboardingDesiredStateSchema.options

const OPTION_BUTTON_BASE = 'rounded-xl border text-sm font-medium transition-all disabled:opacity-50'
const OPTION_BUTTON_SELECTED =
  'border-[var(--color-violet-500)]/60 bg-[var(--color-violet-900)]/40 text-[var(--color-violet-300)]'
const OPTION_BUTTON_UNSELECTED = 'border-white/10 text-white/70 hover:border-white/20 hover:text-white/90'
const SKIP_BUTTON = 'w-full text-center text-white/40 hover:text-white/60 text-sm py-2 transition-colors disabled:opacity-50'
const CONTINUE_BUTTON =
  'w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-xl px-4 py-3 font-medium transition-all mt-4'

interface Props {
  step: CardStep
  cardIndex: number
  cardTotal: number
  saving: boolean
  currentState: OnboardingCurrentState | null
  activeDomainLabels: OnboardingActiveDomainOption[]
  desiredStates: OnboardingDesiredState[]
  interactionPreferenceLabel: OnboardingInteractionPreferenceOption | null
  onCurrentState: (value: OnboardingCurrentState) => void
  onSkipCurrentState: () => void
  onToggleActiveDomain: (label: OnboardingActiveDomainOption) => void
  onActiveDomainsContinue: () => void
  onSkipActiveDomains: () => void
  onToggleDesiredState: (value: OnboardingDesiredState) => void
  onDesiredStatesContinue: () => void
  onSkipDesiredStates: () => void
  onInteractionPreference: (label: OnboardingInteractionPreferenceOption) => void
  onSkipInteractionPreference: () => void
}

/**
 * The four tap-to-choose cards, rendered as a `Card` under the greeting
 * bubble in Main Chat's own thread — the reference screenshot's shape
 * (progress counter, prompt, option grid, Skip), not the old `/onboarding`
 * route's full-screen version. Same options/copy/skip semantics as that
 * page had; only the container changed.
 */
export default function OnboardingCardPanel(props: Props) {
  const t = useTranslations('Onboarding')
  const { step, cardIndex, cardTotal, saving } = props

  return (
    <Card className="mt-2 w-full max-w-[420px] !p-4">
      <p className="text-[var(--color-text-tertiary)] text-xs text-center mb-3">
        {t('progress', { step: cardIndex + 1, total: cardTotal })}
      </p>

      {step === 'currentState' && (
        <div>
          <h2 className="text-white text-base font-light text-center mb-4">{t('cards.currentState.prompt')}</h2>
          <div className="space-y-2">
            {CURRENT_STATE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => props.onCurrentState(option)}
                disabled={saving}
                className={`w-full text-start py-3 px-4 ${OPTION_BUTTON_BASE} ${
                  props.currentState === option ? `${OPTION_BUTTON_SELECTED} scale-[0.98]` : OPTION_BUTTON_UNSELECTED
                }`}
              >
                {t(`cards.currentState.options.${option}`)}
              </button>
            ))}
          </div>
          <button onClick={props.onSkipCurrentState} disabled={saving} className={`${SKIP_BUTTON} mt-2`}>
            {t('cards.skipButton')}
          </button>
        </div>
      )}

      {step === 'activeDomains' && (
        <div>
          <h2 className="text-white text-base font-light text-center mb-1">{t('cards.activeDomains.prompt')}</h2>
          <p className="text-white/40 text-xs text-center mb-4">{t('cards.activeDomains.hint')}</p>
          <div className="grid grid-cols-2 gap-2">
            {ONBOARDING_ACTIVE_DOMAIN_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => props.onToggleActiveDomain(option)}
                className={`py-2.5 px-3 ${OPTION_BUTTON_BASE} ${
                  props.activeDomainLabels.includes(option) ? OPTION_BUTTON_SELECTED : OPTION_BUTTON_UNSELECTED
                }`}
              >
                {t(`cards.activeDomains.options.${option}`)}
              </button>
            ))}
          </div>
          <button onClick={props.onActiveDomainsContinue} disabled={saving} className={CONTINUE_BUTTON}>
            {saving ? t('continuing') : t('cards.continueButton')}
          </button>
          <button onClick={props.onSkipActiveDomains} disabled={saving} className={SKIP_BUTTON}>
            {t('cards.skipButton')}
          </button>
        </div>
      )}

      {step === 'desiredStates' && (
        <div>
          <h2 className="text-white text-base font-light text-center mb-1">{t('cards.desiredStates.prompt')}</h2>
          <p className="text-white/40 text-xs text-center mb-4">{t('cards.desiredStates.hint')}</p>
          <div className="grid grid-cols-2 gap-2">
            {DESIRED_STATE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => props.onToggleDesiredState(option)}
                className={`py-2.5 px-3 ${OPTION_BUTTON_BASE} ${
                  props.desiredStates.includes(option) ? OPTION_BUTTON_SELECTED : OPTION_BUTTON_UNSELECTED
                }`}
              >
                {t(`cards.desiredStates.options.${option}`)}
              </button>
            ))}
          </div>
          <button onClick={props.onDesiredStatesContinue} disabled={saving} className={CONTINUE_BUTTON}>
            {saving ? t('continuing') : t('cards.continueButton')}
          </button>
          <button onClick={props.onSkipDesiredStates} disabled={saving} className={SKIP_BUTTON}>
            {t('cards.skipButton')}
          </button>
        </div>
      )}

      {step === 'interactionPreference' && (
        <div>
          <h2 className="text-white text-base font-light text-center mb-4">
            {t('cards.interactionPreference.prompt')}
          </h2>
          <div className="space-y-2">
            {ONBOARDING_INTERACTION_PREFERENCE_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => props.onInteractionPreference(option)}
                disabled={saving}
                className={`w-full text-start py-3 px-4 ${OPTION_BUTTON_BASE} ${
                  props.interactionPreferenceLabel === option
                    ? `${OPTION_BUTTON_SELECTED} scale-[0.98]`
                    : OPTION_BUTTON_UNSELECTED
                }`}
              >
                {t(`cards.interactionPreference.options.${INTERACTION_PREFERENCE_TO_MODE[option]}`)}
              </button>
            ))}
          </div>
          <button onClick={props.onSkipInteractionPreference} disabled={saving} className={`${SKIP_BUTTON} mt-2`}>
            {t('cards.skipButton')}
          </button>
        </div>
      )}
    </Card>
  )
}
