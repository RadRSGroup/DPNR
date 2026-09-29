'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import CheckInModal from '@/components/shared/CheckInModal'

interface Props {
  sessionTitle: string
  onContinue: () => void
  onBack: () => void
}

/**
 * Mirror depth, slice 1: a pause before the synthesis (docs/MIRROR_DEPTH_REVIEW.md
 * item 6). Nothing to answer; the person moves on when they're ready, and can
 * open the Breath exercise (the same 4/4/6 rhythm as elsewhere) first.
 */
export default function ContainmentPause({ sessionTitle, onContinue, onBack }: Props) {
  const t = useTranslations('MirrorDepth')
  const [breathing, setBreathing] = useState(false)

  return (
    <MirrorStepShell step={5} sessionTitle={sessionTitle} onBack={onBack} screenLabel={t('pause.label')}>
      {breathing && <CheckInModal onClose={() => setBreathing(false)} />}
      <div className="flex-1 flex flex-col justify-center items-center gap-7 pt-2 text-center animate-fade-in">
        <div aria-hidden className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(167,139,250,0.55)_0%,_rgba(139,92,246,0.18)_55%,_transparent_75%)] animate-soft-glow" />
          <div className="absolute inset-8 rounded-full bg-white/15 border border-white/20" />
        </div>
        <div className="space-y-3 max-w-md">
          <h2 className="font-display text-white text-xl lg:text-2xl leading-snug">{t('pause.title')}</h2>
          <p className="text-white/70 text-sm lg:text-base leading-relaxed">{t('pause.body')}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={() => setBreathing(true)}
            className="w-full py-3.5 rounded-full border border-white/20 text-white/75 hover:text-white hover:border-white/35 text-sm transition-colors"
          >
            {t('pause.breathe')}
          </button>
          <PrimaryButton label={t('pause.ready')} onClick={onContinue} />
        </div>
      </div>
    </MirrorStepShell>
  )
}
