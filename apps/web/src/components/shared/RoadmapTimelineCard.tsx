'use client'
import { useTranslations } from 'next-intl'
import Card from '@/components/ui/Card'
import type { DashboardResponse } from '@dpnr/shared-types'

/**
 * Real currentFocus/theme/direction 3-node timeline — no fabricated 4th
 * "Intention" node (RoadmapItemSchema has no such field). Extracted from
 * Dashboard (Session 19) so Growth Tracker (Slice 4) renders the exact same
 * real Roadmap rather than a second, drifting copy of this markup.
 *
 * Session 69: restyled to the designer's Dashboard reference (hollow glowing
 * nodes on one gradient line, colored step labels) and localized. `roadmap`
 * may be null — the card then keeps its place with an honest empty line
 * (user decision: every reference widget always shows). `actions` is an
 * optional slot in the header (Dashboard puts the lifecycle controls there).
 *
 * Stacks vertically below `lg:` and only goes horizontal at `lg:`, where the
 * card is wide enough for three columns to hold real content without
 * truncating it (caught live, see docs/AGENT_LOG.md Session 26).
 */
export default function RoadmapTimelineCard({
  roadmap,
  actions,
  loading = false,
}: {
  roadmap: DashboardResponse['roadmap']
  actions?: React.ReactNode
  /** While the Dashboard is still loading, show a soft placeholder, not the empty line. */
  loading?: boolean
}) {
  const t = useTranslations('Dashboard.roadmap')
  return (
    <Card className="lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-4">
        <p className="text-white text-base lg:text-lg whitespace-nowrap">{t('title')}</p>
        {actions}
      </div>
      {roadmap ? (
        <div className="relative">
          {/* One continuous line behind the three nodes (desktop). Gradient
              flips under RTL because the row itself reverses. */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-[11px] start-3 end-3 h-0.5 rounded-full bg-gradient-to-r rtl:bg-gradient-to-l from-[var(--color-violet-500)] via-[var(--color-magenta-500)] to-[var(--color-amber-400)] opacity-70"
          />
          <div className="relative flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
            <RoadmapNode label={t('currentFocus')} value={roadmap.currentFocus} color="var(--color-violet-400)" />
            <RoadmapNode label={t('theme')} value={roadmap.theme} color="var(--color-violet-500)" />
            <RoadmapNode label={t('direction')} value={roadmap.direction} color="var(--color-magenta-500)" />
          </div>
        </div>
      ) : loading ? (
        <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse" />
      ) : (
        <p className="text-sm text-[var(--color-text-tertiary)]">{t('empty')}</p>
      )}
    </Card>
  )
}

function RoadmapNode({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex lg:flex-col gap-3 lg:gap-2 min-w-0 lg:flex-1">
      <span
        aria-hidden
        className="w-6 h-6 shrink-0 rounded-full border-2 bg-[var(--color-bg-base)] flex items-center justify-center"
        style={{ borderColor: color, boxShadow: `0 0 10px 0 ${color}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider" style={{ color }}>
          {label}
        </p>
        <p className="text-sm text-white mt-0.5 lg:line-clamp-2">{value}</p>
      </div>
    </div>
  )
}
