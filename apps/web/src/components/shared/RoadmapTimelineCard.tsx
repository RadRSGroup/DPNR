import Card from '@/components/ui/Card'
import type { DashboardResponse } from '@dpnr/shared-types'

/**
 * Real currentFocus/theme/direction 3-node timeline — no fabricated 4th
 * "Intention" node (RoadmapItemSchema has no such field). Extracted from
 * Dashboard (Session 19) so Growth Tracker (Slice 4) renders the exact same
 * real Roadmap rather than a second, drifting copy of this markup.
 */
export default function RoadmapTimelineCard({ roadmap }: { roadmap: NonNullable<DashboardResponse['roadmap']> }) {
  return (
    <Card>
      <p className="text-white/40 text-xs uppercase tracking-wide mb-4">My Roadmap</p>
      <div className="flex items-start gap-1.5 sm:gap-2">
        <RoadmapNode label="Current Focus" value={roadmap.currentFocus} color="var(--color-amber-400)" />
        <div className="w-4 sm:w-6 h-px shrink-0 bg-gradient-to-r from-[var(--color-amber-400)] to-[var(--color-violet-500)] mt-2" />
        <RoadmapNode label="Theme" value={roadmap.theme} color="var(--color-violet-400)" />
        <div className="w-4 sm:w-6 h-px shrink-0 bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)] mt-2" />
        <RoadmapNode label="Direction" value={roadmap.direction} color="var(--color-magenta-500)" align="right" />
      </div>
    </Card>
  )
}

function RoadmapNode({ label, value, color, align = 'left' }: { label: string; value: string; color: string; align?: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col min-w-0 flex-1 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div className="w-3 h-3 rounded-full mb-2 shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px 0 ${color}` }} />
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-sm text-white mt-0.5 line-clamp-2">{value}</p>
    </div>
  )
}
