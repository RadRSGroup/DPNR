'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Heart, Sun } from 'lucide-react'
import Card from '@/components/ui/Card'
import { sendDailyCardFeedback } from '@/lib/api/v1-client'
import type { CompanionContextResponse } from '@dpnr/shared-types'

/**
 * "Today's Insight" as the reference draws it: the quote over a landscape
 * photo, with a heart. The text is today's real Daily Card when one exists
 * (the heart then sends the same "relevant" feedback DailyGuidanceCard's
 * "Useful" did), otherwise the Dashboard's continuity cue, otherwise an
 * honest empty line. Photo: the existing Library header landscape — the
 * reference's own sunrise is a flattened mockup crop (see PHOTOS_NEEDED.md).
 */
export default function InsightCard({
  dailyCard: initialDailyCard,
  cueText,
  loading = false,
}: {
  dailyCard: CompanionContextResponse['dailyCard']
  cueText: string | null
  loading?: boolean
}) {
  const t = useTranslations('Dashboard.insight')
  const [dailyCard, setDailyCard] = useState(initialDailyCard)
  const text = dailyCard?.text ?? cueText

  async function markResonates() {
    if (!dailyCard || dailyCard.feedback !== null) return
    setDailyCard({ ...dailyCard, feedback: 'relevant' })
    try {
      await sendDailyCardFeedback({ feedback: 'relevant' })
    } catch {
      // Best-effort, same as DailyGuidanceCard — the heart stays filled locally.
    }
  }

  return (
    <Card className="lg:px-5">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-white text-base lg:text-lg">{t('title')}</p>
        <Sun className="w-4 h-4 text-[var(--color-amber-400)]" aria-hidden />
      </div>
      <div className="relative rounded-2xl overflow-hidden aspect-[4/3.6] border border-white/10">
        <Image src="/images/library/header.webp" alt="" fill sizes="320px" className="object-cover object-[60%_center]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-end text-center px-5 pb-5">
          <p className={`text-white leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${text ? 'font-display text-lg' : 'text-sm text-white/80'}`}>
            {text ? <>&ldquo;{text}&rdquo;</> : loading ? ' ' : t('empty')}
          </p>
          {dailyCard && (
            <button
              onClick={markResonates}
              aria-label={t('resonates')}
              aria-pressed={dailyCard.feedback === 'relevant'}
              className="mt-3 text-[var(--color-amber-300)] hover:scale-110 transition-transform"
            >
              <Heart className="w-5 h-5" fill={dailyCard.feedback === 'relevant' ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
