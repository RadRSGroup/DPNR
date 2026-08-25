'use client'
import { useState } from 'react'
import Image from 'next/image'
import Card from '@/components/ui/Card'
import { sendDailyCardFeedback } from '@/lib/api/v1-client'
import type { CompanionContextResponse } from '@dpnr/shared-types'

interface Props {
  dailyCard: NonNullable<CompanionContextResponse['dailyCard']>
  title?: string
  showImage?: boolean
}

/**
 * The real Daily Card, shown wherever the reference design calls for a
 * "Pull a Card"/"Today's Guidance"/"Today's Insight" widget (Main Chat,
 * Decision Room, Mirror Room) — extracted once here rather than copied into
 * each page, since it's the same backend item and the same feedback
 * endpoint (`POST /v1/daily-card/feedback`) everywhere it appears. Each
 * caller fetches its own `GET /v1/companion/context` independently (no
 * shared cache exists yet, same as Dashboard's own separate fetch — see
 * AGENT_LOG.md's note on `continuityCue` vs. Companion's `dailyCard` not
 * staying in sync today), so feedback given here won't retroactively update
 * another already-rendered instance on a different page this same session.
 * `dailyCard` is required non-null — callers already gate rendering on
 * `dailyCard &&`, since there's nothing honest to show otherwise.
 */
export default function DailyGuidanceCard({ dailyCard: initial, title = "Today's Guidance", showImage = true }: Props) {
  const [dailyCard, setDailyCard] = useState(initial)
  const [dismissed, setDismissed] = useState(false)

  async function feedback(action: 'dismiss' | 'relevant' | 'not_relevant') {
    if (action === 'dismiss') {
      setDismissed(true)
    } else {
      setDailyCard((prev) => ({ ...prev, feedback: action }))
    }
    try {
      await sendDailyCardFeedback(action === 'dismiss' ? { dismissed: true } : { feedback: action })
    } catch {
      // Local state already reflects the action — a failed write just means it may resurface next load.
    }
  }

  if (dismissed) return null

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs uppercase tracking-wide">{title}</p>
        <button onClick={() => feedback('dismiss')} className="text-white/30 hover:text-white/60 text-sm" title="Dismiss">
          ×
        </button>
      </div>
      {showImage && (
        <div className="relative rounded-xl overflow-hidden h-40 mb-3">
          <Image src="/images/companion/pull-a-card.webp" alt="" fill sizes="320px" className="object-cover" />
        </div>
      )}
      <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{dailyCard.text}&rdquo;</p>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => feedback('relevant')}
          disabled={dailyCard.feedback !== null}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            dailyCard.feedback === 'relevant'
              ? 'border-[var(--color-violet-500)]/50 text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/20'
              : 'border-white/10 text-white/40 hover:text-white/60 disabled:opacity-40'
          }`}
        >
          Useful
        </button>
        <button
          onClick={() => feedback('not_relevant')}
          disabled={dailyCard.feedback !== null}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            dailyCard.feedback === 'not_relevant'
              ? 'border-[var(--color-violet-500)]/50 text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/20'
              : 'border-white/10 text-white/40 hover:text-white/60 disabled:opacity-40'
          }`}
        >
          Not for me
        </button>
      </div>
    </Card>
  )
}
