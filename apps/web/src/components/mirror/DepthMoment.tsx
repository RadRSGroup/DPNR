'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { staggerClass } from '@/lib/motion'

export type DepthMomentKind = 'after_felt' | 'after_impact'

// What "a little deeper" holds after each point (docs/MIRROR_DEPTH_REVIEW.md):
// the emotion underneath after Step 2; payoff and deeper belief after Step 4.
// Origin is deliberately absent: it's only ever user-led (founder #37).
const PROMPTS: Record<DepthMomentKind, ('underneath' | 'payoff' | 'belief')[]> = {
  after_felt: ['underneath'],
  after_impact: ['payoff', 'belief'],
}

const STEP: Record<DepthMomentKind, number> = { after_felt: 2, after_impact: 4 }

interface Props {
  kind: DepthMomentKind
  sessionTitle: string
  onContinue: () => void
  onBack: () => void
}

/**
 * Mirror depth, slice 1 (founder feedback #30/#31): after Steps 2 and 4 the
 * person chooses to stay a little longer or to continue. Continue keeps
 * today's flow exactly; going deeper shows questions to sit with. Nothing is
 * typed or saved here yet (slice 2 adds optional, encrypted answers in these
 * same places), so no paid call and no persistence.
 */
export default function DepthMoment({ kind, sessionTitle, onContinue, onBack }: Props) {
  const t = useTranslations('MirrorDepth')
  const [deeper, setDeeper] = useState(false)

  if (!deeper) {
    return (
      <MirrorStepShell step={STEP[kind]} sessionTitle={sessionTitle} onBack={onBack} screenLabel={t('choice.label')}>
        <div className="flex-1 flex flex-col justify-center gap-6 pt-2 text-center animate-settle-in">
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="font-display text-white text-xl lg:text-2xl leading-snug">{t('choice.title')}</h2>
            <p className="text-white/70 text-sm lg:text-base leading-relaxed">{t('choice.body')}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            <button
              onClick={() => setDeeper(true)}
              className="w-full py-3.5 rounded-full border border-[var(--color-violet-400)]/50 text-[var(--color-violet-200)] hover:bg-white/[0.06] text-sm transition-colors"
            >
              {t('choice.deeper')}
            </button>
            <PrimaryButton label={t('choice.continue')} onClick={onContinue} />
          </div>
        </div>
      </MirrorStepShell>
    )
  }

  return (
    <MirrorStepShell step={STEP[kind]} sessionTitle={sessionTitle} onBack={() => setDeeper(false)} screenLabel={t('deeper.label')}>
      <div className="flex-1 flex flex-col gap-5 pt-2">
        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
          {PROMPTS[kind].map((key, i) => (
            <section
              key={key}
              className={`rounded-3xl border border-white/12 bg-white/[0.05] px-5 py-5 space-y-2 text-center animate-settle-in ${staggerClass(i)}`}
            >
              <h2 className="font-display text-white text-lg lg:text-xl leading-snug">{t(`prompts.${key}.title`)}</h2>
              <p className="text-white/65 text-sm leading-relaxed">{t(`prompts.${key}.body`)}</p>
            </section>
          ))}
          <p className="text-[var(--color-text-tertiary)] text-xs text-center leading-relaxed max-w-sm mx-auto">{t('deeper.hint')}</p>
        </div>
        <PrimaryButton label={t('deeper.continue')} onClick={onContinue} />
      </div>
    </MirrorStepShell>
  )
}
