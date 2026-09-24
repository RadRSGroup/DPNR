'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import type { TwinListResponse } from '@dpnr/shared-types'

const ORBS = ['/images/mirror/pattern-orb-1.webp', '/images/mirror/pattern-orb-2.webp', '/images/mirror/pattern-orb-3.webp', '/images/mirror/pattern-orb-4.webp']

/**
 * Patterns Track in the reference's row design, filled with the person's own
 * confirmed `domain='pattern'` Twin signals in their own words, bar = the
 * signal's confidence (user decision, Session 69: real patterns, reference
 * layout — not the reference's fixed Overthinking/Pleasing/… catalogue, which
 * no classifier produces). The footer carries the real Roadmap theme.
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
            const pct = Math.round(p.confidence * 100)
            return (
              <li key={p.signalId} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-2.5 py-2">
                <span className="relative w-6 h-6 shrink-0">
                  <Image src={ORBS[i % ORBS.length]} alt="" fill sizes="24px" />
                </span>
                <p className="flex-1 min-w-0 text-xs text-white/85 truncate" title={p.description}>{p.description}</p>
                <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden shrink-0">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)]" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] w-8 text-end shrink-0">{pct}%</span>
              </li>
            )
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
