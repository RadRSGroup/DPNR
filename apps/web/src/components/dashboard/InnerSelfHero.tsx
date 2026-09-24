'use client'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowRight, Info } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Card from '@/components/ui/Card'
import type { DashboardResponse } from '@dpnr/shared-types'

/**
 * "My InnerSelf" hero, laid out like the designer's Dashboard reference:
 * score ring + "View My Evolution" on the start side, the InnerSelf art in
 * the middle, the current Roadmap phase on the end side.
 *
 * The ring is the real Alignment Score and stays confidence-gated (ADR 0011):
 * a number only when `alignmentScoreState === 'eligible'`, otherwise the same
 * honest qualitative state as before, inside the same ring.
 */
export default function InnerSelfHero({ dashboard, loading = false }: { dashboard: DashboardResponse | null; loading?: boolean }) {
  const t = useTranslations('Dashboard.innerSelf')
  const eligible = dashboard?.alignmentScoreState === 'eligible' && dashboard.alignmentScore != null
  const score = eligible ? dashboard!.alignmentScore! : 0

  return (
    <Card className="relative overflow-hidden !p-0 min-h-[220px] lg:min-h-[250px]">
      <div className="absolute inset-0 -z-0">
        <Image
          src="/images/dashboard/inner-self-hero.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover object-[65%_center] opacity-90"
          preload
        />
        {/* Keep the score side and the phase side readable over the art. */}
        <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-[var(--color-bg-base)] via-[var(--color-bg-base)]/40 to-[var(--color-bg-base)]/80" />
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-stretch justify-between gap-6 p-5 lg:p-7 h-full">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <p className="font-display text-xl lg:text-2xl text-white">{t('title')}</p>
            <Info className="w-4 h-4 text-white/50" aria-label={t('info')} />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('subtitle')}</p>

          <div className="flex items-center gap-4 mt-5">
            <ScoreRing percent={score}>
              {loading ? null : eligible ? (
                <span className="text-2xl font-light text-white">{score}%</span>
              ) : (
                <span className="text-[10px] leading-tight text-[var(--color-text-tertiary)] text-center px-3">
                  {dashboard?.alignmentScoreState === 'developing' ? t('pictureForming') : t('stillLearning')}
                </span>
              )}
            </ScoreRing>
            <p className="text-sm text-white/80">{t('alignmentScore')}</p>
          </div>

          <Link
            href="/evolution-map"
            className="mt-5 self-start inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm text-white/85 hover:border-white/45 hover:text-white transition-colors"
          >
            {t('viewEvolution')}
            <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>

        <div className="flex flex-col justify-center sm:items-end sm:text-end sm:max-w-[45%]">
          {dashboard?.roadmap ? (
            <>
              <p className="text-sm text-[var(--color-magenta-500)]/90">{t('phaseOf')}</p>
              <p className="font-display text-2xl lg:text-3xl text-[var(--color-amber-300)] mt-1 leading-tight">
                {dashboard.roadmap.theme}
              </p>
            </>
          ) : loading ? null : (
            <p className="text-sm text-white/60 max-w-60">{t('phaseEmpty')}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Gradient score ring (violet → rose), like the reference. */
function ScoreRing({ percent, children }: { percent: number; children: React.ReactNode }) {
  const size = 96
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="inner-self-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-violet-500)" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
        {percent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            stroke="url(#inner-self-ring)"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(percent, 100) / 100)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
