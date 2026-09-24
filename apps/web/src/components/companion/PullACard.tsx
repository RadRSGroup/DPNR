'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Sparkle } from 'lucide-react'
import DirectiveCard from './DirectiveCard'
import { pullCompanionCard } from '@/lib/api/v1-client'
import { cardImage, CARD_DEFAULT_IMAGE } from '@/lib/library/topic-images'
import type { PullCardResponse } from '@dpnr/shared-types'

/**
 * Companion's "Pull a Card" (Session 42, context-aware selection + Suggested
 * Route added in the 300-question-bank session) — an on-demand pull from a
 * stored, reusable card library (`POST .../pull-card`), a genuinely
 * different mechanic from the scheduled once-daily Daily Card the other
 * three rooms still use. Confirmed with the user: Companion-only, replaces
 * this exact widget slot rather than stacking alongside the untouched Daily
 * Card elsewhere.
 *
 * Visual design follows the designer's card reference
 * (`docs/reference-screens/Pull_a_card_reference/`): a full-bleed photo card
 * with a glowing frame, the question in a handwritten face over the image,
 * a short divider and tagline, and a wide glowing button beneath. The photo
 * changes with the pulled card's `topic` (`cardImage`, reusing the Library's
 * own art — the reference's own scene has its text baked in, so it can't be
 * used). The seeded `imageRef` is deliberately ignored: every card still
 * carries the one old placeholder there.
 *
 * `directive` reuses `DirectiveCard` (companion/message.ts's own routing
 * card) rather than a second navigation UI — it only ever arrives as
 * `open_room` or `null` for this endpoint (companion/pull-card.ts's own
 * resolver), which `DirectiveCard` already renders correctly.
 */
export default function PullACard() {
  const t = useTranslations('Companion.pullACard')
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

  const text = card ? card.text : error ? t('error') : t('prompt')

  // Scaling: the desktop column is a third of the viewport, so on large
  // screens the card got huge (~780px wide / ~975px tall at 2560) while the
  // question stopped growing at a fixed size, and the button fell below the
  // fold. The section is a size container, so type, padding and divider scale
  // with the card's own width (`cqw`, clamped to the old sizes at the narrow
  // end), and the card's height is capped to the viewport — past the cap it
  // simply goes squarer, which is closer to the designer's reference anyway.
  return (
    <section aria-label={t('heading')} className="@container">
      <div
        className="relative aspect-[4/3] lg:aspect-[4/5] lg:max-h-[58vh] rounded-3xl overflow-hidden border border-white/40 shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_28px_2px_rgba(139,92,246,0.45)]"
      >
        {/* Keyed so each new card fades in rather than swapping abruptly */}
        <div key={card?.cardId ?? 'empty'} className="fade-up absolute inset-0">
          <Image
            src={card ? cardImage(card.topic) : CARD_DEFAULT_IMAGE}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
          {/* Darkens the middle band where the text sits, keeping the edges of the photo bright */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.25)_55%,rgba(0,0,0,0.05)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Question and tagline stack in normal flow (not both absolutely
              placed), so a long question in a narrow column pushes against
              the tagline instead of running over it. */}
          <div className="absolute inset-0 flex flex-col items-center px-[clamp(1.25rem,7cqw,3.5rem)] pt-[clamp(1.5rem,7cqw,3.5rem)] pb-[clamp(1.25rem,5cqw,2.5rem)] text-center">
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
              <p
                className={`font-hand rtl:font-display text-white leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                  text.length > 70
                    ? 'text-[clamp(1.125rem,5.5cqw,2.25rem)]'
                    : 'text-[clamp(1.25rem,6.5cqw,3rem)]'
                }`}
              >
                {text}
              </p>
              <span className="mt-[clamp(1rem,4cqw,2rem)] h-px w-[clamp(3rem,12cqw,6rem)] shrink-0 bg-white/80" />
            </div>
            <p className="mt-3 text-white/90 text-[clamp(10px,2cqw,15px)] uppercase tracking-[0.2em] @md:tracking-[0.25em] leading-relaxed drop-shadow">
              {t('tagline')}
            </p>
          </div>
        </div>
      </div>

      {card?.directive && <DirectiveCard directive={card.directive} />}

      <button
        onClick={pull}
        disabled={loading}
        className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-3xl border border-white/25 bg-gradient-to-b from-[var(--color-violet-500)] to-[var(--color-violet-600)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_24px_rgba(139,92,246,0.55)] hover:brightness-110 disabled:opacity-60 px-4 py-3.5 @xl:py-4 text-base lg:text-lg @xl:text-xl text-white transition-all"
      >
        <Sparkle className="w-5 h-5 @xl:w-6 @xl:h-6" strokeWidth={1.5} />
        {loading ? t('pulling') : card ? t('pullAgain') : t('pullFirst')}
      </button>
    </section>
  )
}
