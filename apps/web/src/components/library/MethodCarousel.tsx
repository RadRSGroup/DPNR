'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { DPNR_METHOD } from '@/lib/library/method-content'

const AUTO_ADVANCE_MS = 9000
const SWIPE_PX = 40

/**
 * The Library's main banner (founder, Living Feedback Log 2026-09-29):
 * the six "DPNR Method" pieces as one large clickable slider, replacing
 * Featured Today and the Method shelf. Art is the founder's text-free
 * header set (Drive → Library → Pictures for each category → Header);
 * title and subtitle stay live text so they can be read and translated.
 *
 * Slides crossfade (opacity only, MOTION.md): nothing slides sideways.
 * Auto-advance is slow, pauses while hovered/focused or the tab is hidden,
 * and is off entirely under reduced motion. Dots, arrows (desktop) and a
 * horizontal swipe (touch) all move between slides.
 */
export default function MethodCarousel() {
  const t = useTranslations('Library')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const pointerStart = useRef<number | null>(null)
  const count = DPNR_METHOD.length

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count)
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [paused, count, index])

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('method.carouselLabel')}
      className="relative mb-8 touch-pan-y overflow-hidden rounded-[var(--radius-card-lg)] ring-1 ring-white/10 h-72 sm:h-80 lg:h-[26rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={(e) => { if (e.pointerType !== 'mouse') pointerStart.current = e.clientX }}
      onPointerUp={(e) => {
        const start = pointerStart.current
        pointerStart.current = null
        if (start === null) return
        const dx = e.clientX - start
        if (Math.abs(dx) < SWIPE_PX) return
        // Forward follows reading direction: a leftward swipe advances in
        // LTR, a rightward one in RTL.
        const rtl = document.documentElement.dir === 'rtl'
        go((dx < 0) !== rtl ? 1 : -1)
      }}
    >
      {DPNR_METHOD.map((piece, i) => {
        const active = i === index
        return (
          <Link
            key={piece.slug}
            href={`/library/method/${piece.slug}`}
            aria-hidden={!active}
            tabIndex={active ? 0 : -1}
            aria-roledescription="slide"
            aria-label={t('method.slideLabel', { current: i + 1, total: count, title: piece.title })}
            className={`group absolute inset-0 block transition-opacity duration-(--motion-slow) ease-settle ${
              active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            }`}
          >
            <Image
              src={piece.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover transition-transform duration-(--motion-slow) group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
            />
            {/* Scrim on the text's (start) side only, so the art stays bright */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)]/90 via-[var(--color-bg-base)]/35 to-transparent lg:bg-gradient-to-r rtl:lg:bg-gradient-to-l lg:from-[var(--color-bg-base)]/80 lg:via-[var(--color-bg-base)]/30" />
            <div className="absolute inset-0 flex flex-col items-start justify-end lg:justify-center p-6 pb-12 lg:p-14 lg:max-w-[58%]">
              <h2 className="font-display text-3xl lg:text-5xl text-white leading-tight drop-shadow-md">{piece.title}</h2>
              <p className="text-white/80 text-sm lg:text-lg mt-2 lg:mt-3 max-w-xl drop-shadow">{piece.tagline}</p>
              <span className="inline-flex items-center gap-1.5 mt-4 lg:mt-6 rounded-full bg-white/90 group-hover:bg-white px-4 py-1.5 lg:px-5 lg:py-2 text-sm font-medium text-[var(--color-bg-base)] transition-colors">
                {t('method.learnMore')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </span>
            </div>
          </Link>
        )
      })}

      <button
        type="button"
        onClick={() => go(-1)}
        aria-label={t('method.previousSlide')}
        className="hidden lg:flex absolute z-20 start-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white/85 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label={t('method.nextSlide')}
        className="hidden lg:flex absolute z-20 end-4 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white/85 transition-colors"
      >
        <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
      </button>

      <div className="absolute z-20 bottom-4 inset-x-0 flex justify-center gap-2">
        {DPNR_METHOD.map((piece, i) => (
          <button
            key={piece.slug}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t('method.goToSlide', { current: i + 1, total: count })}
            aria-current={i === index}
            className="p-1.5"
          >
            <span
              className={`block h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
