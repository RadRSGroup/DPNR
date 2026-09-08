import Card from '@/components/ui/Card'

/** A single number + label tile, used for the small glance-stat rows atop Growth Tracker and My Evolution Map. */
export default function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <p className="text-lg lg:text-xl text-white font-medium">{value}</p>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{label}</p>
    </Card>
  )
}
