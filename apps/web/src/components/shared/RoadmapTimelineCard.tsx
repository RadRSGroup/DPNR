import Card from '@/components/ui/Card'
import type { DashboardResponse } from '@dpnr/shared-types'

/**
 * Real currentFocus/theme/direction 3-node timeline — no fabricated 4th
 * "Intention" node (RoadmapItemSchema has no such field). Extracted from
 * Dashboard (Session 19) so Growth Tracker (Slice 4) renders the exact same
 * real Roadmap rather than a second, drifting copy of this markup.
 *
 * Stacks vertically (one full-width node per row) below `lg:` and only goes
 * horizontal at `lg:`, where the card is actually wide enough for three
 * columns to hold real content without truncating it almost immediately —
 * squeezing three columns into a ~350px mobile card left real values like
 * "Building steadier boundaries at work" clipped to a couple of words even
 * with `line-clamp-2` (caught live, see docs/AGENT_LOG.md Session 26).
 */
export default function RoadmapTimelineCard({ roadmap }: { roadmap: NonNullable<DashboardResponse['roadmap']> }) {
  return (
    <Card>
      <p className="text-white/40 text-xs uppercase tracking-wide mb-4">My Roadmap</p>
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-2">
        <RoadmapNode label="Current Focus" value={roadmap.currentFocus} color="var(--color-amber-400)" />
        <div className="hidden lg:block w-6 h-px shrink-0 bg-gradient-to-r from-[var(--color-amber-400)] to-[var(--color-violet-500)] mt-2" />
        <RoadmapNode label="Theme" value={roadmap.theme} color="var(--color-violet-400)" />
        <div className="hidden lg:block w-6 h-px shrink-0 bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)] mt-2" />
        <RoadmapNode label="Direction" value={roadmap.direction} color="var(--color-magenta-500)" align="right" />
      </div>
    </Card>
  )
}

function RoadmapNode({ label, value, color, align = 'left' }: { label: string; value: string; color: string; align?: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col min-w-0 lg:flex-1 items-start text-left ${align === 'right' ? 'lg:items-end lg:text-right' : ''}`}>
      <div className="w-3 h-3 rounded-full mb-2 shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 8px 0 ${color}` }} />
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-sm text-white mt-0.5 lg:line-clamp-2">{value}</p>
    </div>
  )
}
