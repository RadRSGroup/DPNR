'use client'
import { useEffect, useRef, useState } from 'react'
import FittedImage from '@/components/ui/FittedImage'
import Card from '@/components/ui/Card'
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
const SHUFFLE_PASS_MS = 800
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

  // Layout (Session 77, user request: back to the reference's "Today's Card",
  // docs/reference-screens/Main_screen_reference/01-main-chat.png): one glass
  // panel with a heading, the card and the button inside it, the same on the
  // desktop column, the mobile landing and the mobile sheet. The card is
  // 11:10, near the reference's square: at that shape every card photo (3:2,
  // square, one 5:6 portrait) fills it edge to edge with FittedImage's <=30%
  // trim, so no blurred band shows (the old 4:5 left one across the top of
  // every 3:2 photo). Size is capped by WIDTH (not height, which would break
  // the aspect ratio) so the panel stays compact on tall/large screens; type
  // and padding scale with the card's width (`cqw`).
  return (
    <Card className="!p-4">
      <h2 className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-3">{t('todaysCard')}</h2>
      {/* overflow-x-clip: shuffling backs can poke a little past the card's
          sides; clip them here instead of scrolling the parent column sideways. */}
      <section aria-label={t('heading')} className="@container overflow-x-clip mx-auto w-full max-w-[calc(58vh*1.1)]">
      <div className="relative mx-auto aspect-[11/10] [perspective:1200px]" aria-busy={shuffling}>
        {/* The deck: two card backs behind the face — peeking out at rest, shuffling while pulling. */}
        <CardBack pose={BACK_POSE.a} shuffleClass={shuffling && !reduced ? 'animate-card-shuffle-a' : ''} />
        <CardBack pose={BACK_POSE.b} shuffleClass={shuffling && !reduced ? 'animate-card-shuffle-b' : ''} />

        <div
          key={dealCount}
          className={`absolute inset-0 z-[4] rounded-3xl overflow-hidden bg-[var(--color-violet-950)] border border-white/40 shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_0_28px_2px_rgba(139,92,246,0.45)] ${faceAnimation}`}
        >
          {/* The photos come in mixed shapes (3:2, portrait, square), so a
              cover crop cut off the important part of some (feedback log,
              2026-09-25), and whole-but-small then felt too small
              (2026-09-27). FittedImage fills the card up to a bounded trim,
              over a blurred copy of itself; same as TopicCover. The blur
              and scale are static, never animated (MOTION.md). */}
          <FittedImage
            src={card ? cardImage(card.topic) : CARD_DEFAULT_IMAGE}
            sizes="(min-width: 1024px) 33vw, 100vw"
            backdropClassName="brightness-75"
            onLoad={() => {
              if (!faceReady) deal()
            }}
          />
          {/* Readability (#40) without the boxed glass panel the reference
              doesn't have: a soft localized darkening behind the question and
              a gradient under the tagline; the photo stays fully visible. */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_45%,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.18)_55%,transparent_85%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/65 to-transparent" />
          {/* One soft light sweep as the card lands (transform/opacity only; none under reduced motion). */}
          {phase === 'dealt' && !reduced && (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-y-0 -inset-x-1/4 animate-card-sheen bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.22)_50%,transparent_62%)]" />
            </div>
          )}

          {/* Question and tagline stack in normal flow (not both absolutely
              placed), so a long question in a narrow column pushes against
              the tagline instead of running over it. */}
          <div className="absolute inset-0 flex flex-col items-center px-[clamp(0.75rem,7cqw,3.5rem)] pt-[clamp(1rem,6cqw,3rem)] pb-[clamp(1rem,5cqw,2.25rem)] text-center">
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
              <p
                className={`font-hand rtl:font-display text-white leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                  text.length > 70
                    ? 'text-[clamp(0.95rem,5.5cqw,2.25rem)]'
                    : 'text-[clamp(1.05rem,6.5cqw,3rem)]'
                }`}
              >
                {text}
              </p>
              <span className="mt-[clamp(0.75rem,4cqw,2rem)] h-px w-[clamp(3rem,12cqw,6rem)] shrink-0 bg-white/80" />
            </div>
            {/* Decorative; left out when the card is very narrow (the
                1024px desktop column) so the longest questions (~100 chars)
                still fit. */}
            <p className="hidden @3xs:block mt-2 max-w-[24em] text-balance text-white/90 text-[clamp(10px,2.6cqw,15px)] uppercase tracking-[0.2em] @md:tracking-[0.25em] leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
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
    </Card>
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
