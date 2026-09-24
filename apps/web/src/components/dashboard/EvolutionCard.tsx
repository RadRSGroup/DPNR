'use client'
import { useLocale, useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import type { DashboardResponse } from '@dpnr/shared-types'

/**
 * My Evolution — the real daily Alignment Score snapshots (last 30 days) as
 * a glowing line with points, like the reference. Needs at least two days;
 * before that the card keeps its place with a faint baseline and an honest
 * line instead of a made-up curve.
 */
export default function EvolutionCard({ history, loading = false }: { history: DashboardResponse['alignmentHistory']; loading?: boolean }) {
  const t = useTranslations('Dashboard.evolution')
  const locale = useLocale()
  const enough = history.length >= 2

  return (
    <Card className="flex flex-col lg:px-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white text-base">{t('title')}</p>
          <p className="text-xs text-[var(--color-violet-300)]/80 mt-0.5">{t('subtitle')}</p>
        </div>
        <span className="text-[11px] text-white/70 rounded-full border border-white/15 px-2.5 py-1 shrink-0">{t('range')}</span>
      </div>

      <div className="flex-1 min-h-[120px] mt-3">
        {enough ? <Chart points={history} /> : <EmptyChart />}
      </div>

      {enough && (
        <div className="flex justify-between text-[10px] text-[var(--color-text-tertiary)] mt-1">
          <span>{new Date(history[0].date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}</span>
          <span>{t('today')}</span>
        </div>
      )}

      <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
        <p className="text-xs text-white/75 leading-relaxed">{enough || loading ? t('footer') : t('empty')}</p>
      </div>
    </Card>
  )
}

function Chart({ points }: { points: { date: string; score: number }[] }) {
  const w = 280
  const h = 110
  const pad = 8
  const coords = points.map((p, i) => ({
    x: pad + (i / (points.length - 1)) * (w - pad * 2),
    y: h - pad - (Math.min(Math.max(p.score, 0), 100) / 100) * (h - pad * 2),
  }))
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`
  const last = coords[coords.length - 1]
  return (
    // SVG coordinates don't mirror under RTL, so time reads left-to-right in both languages.
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="evo-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-violet-500)" />
          <stop offset="100%" stopColor="var(--color-amber-400)" />
        </linearGradient>
        <linearGradient id="evo-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(139,92,246,0.25)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#evo-area)" />
      <polyline points={line} fill="none" stroke="url(#evo-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(245,185,66,0.5))' }} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2} fill={i === coords.length - 1 ? 'var(--color-amber-300)' : 'var(--color-violet-300)'} />
      ))}
      <circle cx={last.x} cy={last.y} r="7" fill="var(--color-amber-400)" opacity="0.25" />
    </svg>
  )
}

function EmptyChart() {
  return (
    <svg viewBox="0 0 280 110" className="w-full h-full" preserveAspectRatio="none" aria-hidden>
      <line x1="8" y1="90" x2="272" y2="90" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 5" />
    </svg>
  )
}
