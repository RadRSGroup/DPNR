'use client'
import Image from 'next/image'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import Card from '@/components/ui/Card'
import type { TwinListResponse } from '@dpnr/shared-types'

const ORBS = ['/images/mirror/pattern-orb-1.webp', '/images/mirror/pattern-orb-2.webp', '/images/mirror/pattern-orb-3.webp', '/images/mirror/pattern-orb-4.webp']

/**
 * Patterns Track in the reference's row design, filled with the person's own
 * confirmed `domain='pattern'` Twin signals in their own words, bar = the
 * signal's confidence (user decision, Session 69: real patterns, reference
 * layout — not the reference's fixed Overthinking/Pleasing/… catalogue, which
 * no classifier produces). The footer carries the real Roadmap theme.
 *
 * A reflection cut off at one line opens in place on tap/click (founder
 * feedback 2026-09-27: "Read More / Expand" rather than enlarging every
 * card; it used to be readable only through a hover tooltip).
 */
export default function PatternsTrackCard({
  patterns,
  theme,
  loading = false,
}: {
  patterns: TwinListResponse['signals']
  theme: string | null
  loading?: boolean
}) {
  const t = useTranslations('Dashboard.patterns')
  return (
    <Card className="flex flex-col lg:px-5">
      <p className="text-white text-base">{t('title')}</p>
      <p className="text-xs text-[var(--color-violet-300)]/80 mt-0.5 mb-3">{t('subtitle')}</p>

      {patterns.length > 0 ? (
        <ul className="space-y-1.5">
          {patterns.slice(0, 4).map((p, i) => {
            return <PatternRow key={p.signalId} description={p.description} percent={Math.round(p.confidence * 100)} orb={ORBS[i % ORBS.length]} />
          })}
        </ul>
      ) : loading ? (
        <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse" />
      ) : (
        <p className="text-sm text-[var(--color-text-tertiary)] flex-1">{t('empty')}</p>
      )}

      {theme && (
        <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
          <p className="text-xs text-white/75 leading-relaxed">{t('mainTheme', { theme })}</p>
        </div>
      )}
    </Card>
  )
}

function PatternRow({ description, percent, orb }: { description: string; percent: number; orb: string }) {
  const t = useTranslations('Dashboard.patterns')
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = textRef.current
    if (!el) return
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [description])

  const canExpand = truncated || expanded
  const body = (
    <>
      <span className="relative w-6 h-6 shrink-0">
        <Image src={orb} alt="" fill sizes="24px" />
      </span>
      <span ref={textRef} className={`min-w-0 text-xs text-white/85 text-start ${expanded ? 'order-last basis-full whitespace-normal leading-relaxed ps-[2.125rem]' : 'flex-1 truncate'}`}>
        {description}
      </span>
      {expanded && <span className="flex-1" aria-hidden />}
      {canExpand && (
        <ChevronDown aria-hidden className={`w-3.5 h-3.5 shrink-0 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      )}
      <span className="w-16 h-1 rounded-full bg-white/10 overflow-hidden shrink-0">
        <span className="block h-full rounded-full bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)]" style={{ width: `${percent}%` }} />
      </span>
      <span className="text-xs text-[var(--color-text-tertiary)] w-8 text-end shrink-0">{percent}%</span>
    </>
  )
  // The row itself never changes element (swapping a <div> for a <button>
  // would remount the text the observer above is measuring); when the text
  // is cut off, a transparent toggle covers the row instead.
  return (
    <li className={`relative flex ${expanded ? 'flex-wrap items-center gap-y-1.5' : 'items-center'} gap-2.5 rounded-xl bg-white/[0.04] px-2.5 py-2 ${canExpand ? 'hover:bg-white/[0.07] transition-colors' : ''}`}>
      {body}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? t('showLess') : t('readMore')}: ${description}`}
          className="absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-violet-400)]"
        />
      )}
    </li>
  )
}
