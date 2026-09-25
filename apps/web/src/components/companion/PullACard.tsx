'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import DirectiveCard from './DirectiveCard'
import RingLogo from '@/components/icons/RingLogo'
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
 *
 * Motion (Session 69, docs/MOTION.md): pulling looks like drawing from a
 * deck. Two card backs always peek out behind the face; on pull the face
 * flips away and the backs shuffle past each other (alternating passes, so
 * each swing starts and ends at rest and the cards only swap at the far
 * point). The new face mounts hidden and is dealt only once its photo has
 * loaded (the text used to arrive before the background did), at the end
 * of a shuffle pass (so the backs are at rest, no snap), after at least
 * MIN_SHUFFLE_MS. Under reduced motion there's no shuffle and the new card
 * fades in once its photo is ready.
 */
const MIN_SHUFFLE_MS = 1100
// One shuffle pass: must match the card-shuffle-* duration in globals.css.
const SHUFFLE_PASS_MS = 700
// Deal anyway if the photo is slow, rather than shuffling forever.
const IMAGE_WAIT_MS = 3000

// The backs' resting pose, shared with the shuffle keyframes (which start
// and end on it) through these custom properties.
const BACK_POSE = {
  a: { '--card-y': '0.5rem', '--card-rot': '2deg', '--card-scale': '0.97' },
  b: { '--card-y': '0.25rem', '--card-rot': '-1deg', '--card-scale': '0.985' },
} as const

type Phase = 'idle' | 'shuffling' | 'dealt'

export default function PullACard() {
  const t = useTranslations('Companion.pullACard')
  const [card, setCard] = useState<PullCardResponse | null>(null)
  const [error, setError] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  // False while a freshly pulled face is mounted but its photo hasn't loaded.
  const [faceReady, setFaceReady] = useState(true)
  // Bumped on every finished pull so the face remounts (and re-deals) even
  // when the same card comes back.
  const [dealCount, setDealCount] = useState(0)
  const [reduced, setReduced] = useState(false)
  const reducedRef = useRef(false)
  const startedAt = useRef(0)
  const dealTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(dealTimer.current), [])

  function deal() {
    window.clearTimeout(dealTimer.current)
    const wait = reducedRef.current ? 0 : SHUFFLE_PASS_MS - ((performance.now() - startedAt.current) % SHUFFLE_PASS_MS)
    dealTimer.current = window.setTimeout(() => {
      setFaceReady(true)
      setPhase('dealt')
    }, wait)
  }

  async function pull() {
    if (phase === 'shuffling') return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedRef.current = reduceMotion
    setReduced(reduceMotion)
    startedAt.current = performance.now()
    setPhase('shuffling')
    setError(false)
    const [result] = await Promise.allSettled([
      pullCompanionCard(),
      new Promise((r) => setTimeout(r, reduceMotion ? 0 : MIN_SHUFFLE_MS)),
    ])
    if (result.status === 'fulfilled') setCard(result.value)
    else setError(true)
    // Mount the new face hidden; its photo's onLoad calls deal().
    setFaceReady(false)
    setDealCount((n) => n + 1)
    dealTimer.current = window.setTimeout(deal, IMAGE_WAIT_MS)
  }

  const shuffling = phase === 'shuffling'
  const faceAnimation = shuffling
    ? faceReady
      ? reduced
        ? 'opacity-0 transition-opacity'
        : 'animate-card-flip-out'
      : 'opacity-0'
    : phase === 'dealt'
      ? reduced
        ? 'animate-fade-in'
        : 'animate-card-deal'
      : ''

  const text = card ? card.text : error ? t('error') : t('prompt')

  // Scaling: the desktop column is a third of the viewport, so on large
  // screens the card got huge (~780px wide / ~975px tall at 2560) while the
  // question stopped growing at a fixed size, and the button fell below the
  // fold. The section is a size container, so type, padding and divider scale
  // with the card's own width (`cqw`, clamped to the old sizes at the narrow
  // end), and the card's height is capped to the viewport — past the cap it
  // simply goes squarer, which is closer to the designer's reference anyway.
  return (
    // overflow-x-clip: shuffling backs can poke a little past the card's
    // sides; clip them here instead of scrolling the parent column sideways.
    <section aria-label={t('heading')} className="@container overflow-x-clip">
      <div className="relative aspect-[4/3] lg:aspect-[4/5] lg:max-h-[58vh] [perspective:1200px]" aria-busy={shuffling}>
        {/* The deck: two card backs behind the face — peeking out at rest, shuffling while pulling. */}
        <CardBack pose={BACK_POSE.a} shuffleClass={shuffling && !reduced ? 'animate-card-shuffle-a' : ''} />
        <CardBack pose={BACK_POSE.b} shuffleClass={shuffling && !reduced ? 'animate-card-shuffle-b' : ''} />

        <div
          key={dealCount}
          className={`absolute inset-0 z-[4] rounded-3xl overflow-hidden bg-[var(--color-violet-950)] border border-white/40 shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_28px_2px_rgba(139,92,246,0.45)] ${faceAnimation}`}
        >
          <Image
            src={card ? cardImage(card.topic) : CARD_DEFAULT_IMAGE}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
            onLoad={() => {
              if (!faceReady) deal()
            }}
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

      {!shuffling && card?.directive && <DirectiveCard directive={card.directive} />}

      <button
        onClick={pull}
        disabled={shuffling}
        className="mt-4 w-full inline-flex items-center justify-center gap-3 rounded-3xl border border-white/25 bg-gradient-to-b from-[var(--color-violet-500)] to-[var(--color-violet-600)] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_24px_rgba(139,92,246,0.55)] hover:brightness-110 disabled:opacity-60 px-4 py-3.5 @xl:py-4 text-base lg:text-lg @xl:text-xl text-white transition-all"
      >
        {shuffling ? t('pulling') : card ? t('pullAgain') : t('pullFirst')}
      </button>
    </section>
  )
}

/** Back of a card in the deck — a stylized DPNR mark: the gradient ring, glowing, with faint echo rings and the wordmark. */
function CardBack({ pose, shuffleClass }: { pose: Record<string, string>; shuffleClass: string }) {
  return (
    <div
      aria-hidden
      style={pose as React.CSSProperties}
      className={`absolute inset-0 z-[1] rounded-3xl overflow-hidden border border-white/25 bg-[radial-gradient(ellipse_at_center,var(--color-violet-800)_0%,var(--color-violet-950)_75%)] shadow-[0_0_20px_rgba(139,92,246,0.35)] [transform:translateY(var(--card-y))_rotate(var(--card-rot))_scale(var(--card-scale))] will-change-transform ${shuffleClass}`}
    >
      <div className="absolute inset-3 rounded-2xl border border-white/10" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative w-[42%] aspect-square flex items-center justify-center">
          <span className="absolute inset-[-18%] rounded-full border border-white/[0.06]" />
          <span className="absolute inset-[-40%] rounded-full border border-white/[0.04]" />
          <span className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.28)_0%,transparent_70%)] blur-md" />
          <RingLogo className="relative w-full h-full drop-shadow-[0_0_10px_rgba(236,72,153,0.55)]" />
        </div>
        <p className="mt-[clamp(0.75rem,6cqw,2rem)] font-display text-white/85 tracking-[0.45em] ps-[0.45em] text-[clamp(0.85rem,5cqw,1.6rem)]">
          DPNR
        </p>
      </div>
    </div>
  )
}
