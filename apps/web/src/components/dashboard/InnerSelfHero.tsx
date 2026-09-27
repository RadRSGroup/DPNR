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
 *
 * While DPNR is still learning (insufficient / developing), light travels
 * slowly around the ring (founder feedback 2026-09-27, "living learning
 * ring"). It is driven only by the existing state, never by a number:
 * developing gets slightly longer, brighter light than insufficient. No
 * progress arc, no spinner speed, nothing that reads as a score.
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
            <ScoreRing
              percent={score}
              learning={loading || eligible ? null : dashboard?.alignmentScoreState === 'developing' ? 'developing' : 'insufficient'}
            >
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
function ScoreRing({
  percent,
  learning,
  children,
}: {
  percent: number
  /** Set while there's no score yet: light travels around the ring instead. */
  learning: 'insufficient' | 'developing' | null
  children: React.ReactNode
}) {
  const size = 96
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  // Arc lengths as a share of the circumference: short travelling lights.
  const arcs = learning === 'developing' ? [0.2, 0.11] : [0.13, 0.07]
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="inner-self-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-violet-500)" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-white/10" />
        {learning &&
          arcs.map((share, i) => (
            // A wide faint stroke under a thin bright one reads as glow
            // without an SVG filter (only transform/opacity animate).
            <g
              key={i}
              className={`origin-center [transform-box:view-box] ${i === 0 ? 'animate-ring-orbit opacity-70' : 'animate-ring-orbit-slow opacity-40'}`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke + 6}
                stroke="url(#inner-self-ring)"
                strokeOpacity={learning === 'developing' ? 0.22 : 0.15}
                strokeLinecap="round"
                strokeDasharray={`${c * share} ${c}`}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={stroke - 2}
                stroke="url(#inner-self-ring)"
                strokeOpacity={learning === 'developing' ? 0.95 : 0.75}
                strokeLinecap="round"
                strokeDasharray={`${c * share} ${c}`}
              />
            </g>
          ))}
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
