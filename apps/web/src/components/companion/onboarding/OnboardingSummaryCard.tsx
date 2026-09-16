import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import {
  OnboardingSnapshotFeedbackSchema,
  LIFE_DOMAIN_LABELS,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type LifeDomainCategory,
  type InteractionMode,
} from '@dpnr/shared-types'

const SNAPSHOT_FEEDBACK_OPTIONS = OnboardingSnapshotFeedbackSchema.options
const OPTION_BUTTON_UNSELECTED = 'border-white/10 text-white/70 hover:border-white/20 hover:text-white/90'

interface Props {
  currentState: OnboardingCurrentState | null
  activeDomainCategories: LifeDomainCategory[]
  desiredStates: OnboardingDesiredState[]
  interactionMode: InteractionMode | null
  intentionText: string
  saving: boolean
  onFeedback: (feedback: (typeof SNAPSHOT_FEEDBACK_OPTIONS)[number]) => void
}

/** First Coordinates — the closing summary + Yes/Partly/Not quite, same content/copy as the old `/onboarding` page's final screen, now a card under Companion's own reply bubble. */
export default function OnboardingSummaryCard({
  currentState,
  activeDomainCategories,
  desiredStates,
  interactionMode,
  intentionText,
  saving,
  onFeedback,
}: Props) {
  const t = useTranslations('Onboarding')
  const isEmpty =
    !currentState && activeDomainCategories.length === 0 && desiredStates.length === 0 && !interactionMode && !intentionText.trim()

  return (
    <Card className="mt-2 w-full max-w-[420px] !p-4">
      <h1 className="text-white text-lg font-light text-center mb-3">{t('summary.title')}</h1>
      <div className="space-y-3">
        {currentState && (
          <div>
            <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.rightNow')}</p>
            <p className="text-white text-sm">{t(`cards.currentState.options.${currentState}`)}</p>
          </div>
        )}
        {activeDomainCategories.length > 0 && (
          <div>
            <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.lifeInFocus')}</p>
            <p className="text-white text-sm">{activeDomainCategories.map((d) => LIFE_DOMAIN_LABELS[d]).join(' • ')}</p>
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
            <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.howYouExplore')}</p>
            <p className="text-white text-sm">{t(`cards.interactionPreference.options.${interactionMode}`)}</p>
          </div>
        )}
        {intentionText.trim() && (
          <div>
            <p className="text-white/40 text-[10px] tracking-widest uppercase mb-1">{t('summary.whatYouWant')}</p>
            <p className="text-white text-sm italic">&quot;{intentionText.trim()}&quot;</p>
          </div>
        )}
        {isEmpty && <p className="text-white/50 text-sm text-center">{t('summary.emptyState')}</p>}
      </div>

      <p className="text-white/40 text-xs text-center mt-4">{t('summary.disclaimer')}</p>
      <p className="text-white text-sm text-center mt-3">{t('summary.feedbackPrompt')}</p>
      <div className="flex gap-2 mt-2">
        {SNAPSHOT_FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onFeedback(option)}
            disabled={saving}
            className={`flex-1 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${OPTION_BUTTON_UNSELECTED} py-2.5 text-center`}
          >
            {t(`summary.feedback.${option}`)}
          </button>
        ))}
      </div>
    </Card>
  )
}
