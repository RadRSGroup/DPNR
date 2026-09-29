'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarButtons } from '@/components/ui/CalendarButtons'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'
import Dictatable from '@/components/ui/Dictatable'

interface CommitmentScreenProps {
  decisionTitle: string
  nextStep?: string
  onDone: (commitment: string) => void
  onBack: () => void
}

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function CommitmentScreen({ decisionTitle, nextStep, onDone, onBack }: CommitmentScreenProps) {
  const t = useTranslations('DecisionRoom')
  const [commitment, setCommitment] = useState(nextStep ?? '')
  const [reviewDate] = useState<string | null>(null)

  const calendarTitle = commitment.trim() || t('commitment.eventTitle', { title: decisionTitle })
  const calendarDate = reviewDate ?? addDays(7)

  return (
    <RoomScreenFrame backgroundSrc="/images/decision/decision-room-hero.webp" dimBackground glows={['bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.45)_0%,_rgba(80,20,140,0.25)_45%,_transparent_75%)]']}>

      {/* Header */}
      <div className="pt-14 lg:pt-8 px-5 pb-4 text-center space-y-1">
        <h1 className="text-white text-lg font-medium">&quot;{decisionTitle}&quot;</h1>
        <p className="text-[var(--color-amber-300)] text-xs uppercase tracking-[0.18em]">{t('stepOf', { step: 6, total: 6, label: t('commitment.beforeYouLeave') })}</p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-5 space-y-5 overflow-y-auto no-scrollbar pb-4">

        {/* Inspirational card */}
        <div className="bg-white/8 border border-white/12 rounded-3xl px-5 py-6 space-y-4 text-center">
          <p className="text-white/60 text-sm leading-relaxed">
            {t('commitment.intro')}
          </p>
          <div className="w-8 h-px bg-white/15 mx-auto" />
          <p className="text-white/80 text-sm leading-relaxed">
            {t('commitment.body')}
          </p>
          <p className="text-white font-medium text-sm">{t('commitment.question')}</p>
        </div>

        {/* Commitment input */}
        <Dictatable>
          <textarea
            value={commitment}
            onChange={e => setCommitment(e.target.value.slice(0, 5000))}
            rows={3}
            placeholder={t('commitment.placeholder')}
            className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </Dictatable>

        {/* Add to Calendar: clearly tappable, clearly optional (founder feedback 2026-09-28 #17). */}
        <div className="rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-4 space-y-3">
          <div className="text-center">
            <p className="text-[var(--color-amber-300)] text-[11px] uppercase tracking-[0.2em]">{t('commitment.optional')}</p>
            <p className="text-white/85 text-sm mt-1">{t('commitment.calendarTitle')}</p>
            <p className="text-white/55 text-xs mt-1 leading-relaxed">{t('commitment.calendarHint')}</p>
          </div>
          <CalendarButtons
            title={calendarTitle}
            date={calendarDate}
            description={t('commitment.eventDescription', { title: decisionTitle })}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-3 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/35 text-sm font-medium transition-all"
        >
          {t('back')}
        </button>
        <InvertedButton onClick={() => onDone(commitment.trim())} className="flex-1 py-3.5" label={t('commitment.done')} />
      </div>
    </RoomScreenFrame>
  )
}
