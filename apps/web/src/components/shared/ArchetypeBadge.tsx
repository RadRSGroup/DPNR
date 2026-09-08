import Image from 'next/image'
import { ARCHETYPE_LABELS, type Archetype } from '@dpnr/shared-types'
import { ARCHETYPE_META } from './archetype-meta'

/** A single illustrated archetype badge — real reference-derived portrait, name, and real percent. */
export default function ArchetypeBadge({ archetype, percent }: { archetype: Archetype; percent: number }) {
  const meta = ARCHETYPE_META[archetype]
  return (
    <div className="flex items-center gap-3">
      <div className={`relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-br ${meta.gradient} shadow-lg`}>
        <Image src={meta.image} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white/80">{ARCHETYPE_LABELS[archetype]}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{percent}%</p>
      </div>
    </div>
  )
}
