import { ARCHETYPE_LABELS, type Archetype } from '@dpnr/shared-types'
import { ARCHETYPE_META } from './archetype-meta'

/** A single illustrated archetype badge — icon + gradient circle, name, and real percent. */
export default function ArchetypeBadge({ archetype, percent }: { archetype: Archetype; percent: number }) {
  const meta = ARCHETYPE_META[archetype]
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3">
      <div className={`w-11 h-11 shrink-0 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white/80">{ARCHETYPE_LABELS[archetype]}</p>
        <p className="text-xs text-white/40">{percent}%</p>
      </div>
    </div>
  )
}
