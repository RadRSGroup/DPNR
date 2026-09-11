'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Layers } from 'lucide-react'
import Card from '@/components/ui/Card'
import DirectiveCard from './DirectiveCard'
import { pullCompanionCard } from '@/lib/api/v1-client'
import type { PullCardResponse } from '@dpnr/shared-types'

/**
 * Companion's "Pull a Card" (Session 42, context-aware selection + Suggested
 * Route added in the 300-question-bank session) — an on-demand pull from a
 * stored, reusable card library (`POST .../pull-card`), a genuinely
 * different mechanic from the scheduled once-daily Daily Card the other
 * three rooms still use. Confirmed with the user: Companion-only, replaces
 * this exact widget slot rather than stacking alongside the untouched Daily
 * Card elsewhere. Every card currently shares one placeholder image
 * (companion/pull-a-card.webp) until real per-card art exists — flagged in
 * the seed data, not faked here.
 *
 * `directive` reuses `DirectiveCard` (companion/message.ts's own routing
 * card) rather than a second navigation UI — it only ever arrives as
 * `open_room` or `null` for this endpoint (companion/pull-card.ts's own
 * resolver), which `DirectiveCard` already renders correctly.
 */
export default function PullACard() {
  const [card, setCard] = useState<PullCardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function pull() {
    if (loading) return
    setLoading(true)
    setError(false)
    try {
      setCard(await pullCompanionCard())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-3">Pull a Card</p>

      {
        // pull-a-card.webp is a real tall/portrait card-back crop (335×580 —
        // an actual card shape, not a landscape banner). A full-width h-40
        // landscape box was the wrong container: object-cover would scale to
        // fill the width and crop most of the card's own height away,
        // leaving a stretched, off-center sliver. Sized to the image's own
        // aspect ratio instead, centered and no wider than it needs to be.
        // Shown even before a pull (matching the reference's own always-visible
        // card art) — every card shares this one placeholder image today, so
        // rendering it pre-pull shows nothing that isn't already true.
      }
      <div className="relative mx-auto mb-3 w-32 aspect-[335/580] rounded-xl overflow-hidden">
        <Image src={card?.imageRef ?? '/images/companion/pull-a-card.webp'} alt="" fill sizes="128px" className="object-cover" />
      </div>

      {card ? (
        <>
          <p className="text-white/80 text-sm leading-relaxed italic">&ldquo;{card.text}&rdquo;</p>
          {card.directive && <DirectiveCard directive={card.directive} />}
        </>
      ) : (
        <p className="text-[var(--color-text-tertiary)] text-sm">
          {error ? "Couldn't pull a card — try again." : 'Pull a card for something to sit with today.'}
        </p>
      )}

      <button
        onClick={pull}
        disabled={loading}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        <Layers className="w-4 h-4" /> {loading ? 'Pulling…' : card ? 'Pull a New Card' : 'Pull a Card'}
      </button>
    </Card>
  )
}
