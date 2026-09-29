import { ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'

/**
 * A single number + label tile, used for the small glance-stat rows atop Growth Tracker and My Evolution Map.
 * With `onClick` it becomes a button (Growth Tracker opens the list behind the number).
 */
export default function StatTile({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const body = (
    <>
      <p className="text-lg lg:text-xl text-white font-medium">{value}</p>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1 inline-flex items-center gap-0.5">
        {label}
        {onClick && <ChevronRight className="w-3 h-3 rtl:rotate-180" aria-hidden />}
      </p>
    </>
  )
  if (!onClick) return <Card className="text-center">{body}</Card>
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-violet-400)]">
      <Card className="text-center h-full transition-colors hover:bg-white/[0.06]">{body}</Card>
    </button>
  )
}
