import type { TwinSignalItem, LifeDomainCategory, Archetype } from '@dpnr/shared-types'

/**
 * Real aggregates (Session 19) over confirmed, classified Twin signals —
 * feeds Dashboard's Life Domains/Leading Archetypes widgets, and will feed
 * Growth Tracker's equivalent widgets once that page exists, without
 * re-deriving this logic. Only categories with at least one classified
 * signal appear — an empty array for a person with zero classified
 * signals, never a fabricated 0%-for-every-category taxonomy.
 */
export function aggregateLifeDomains(signals: TwinSignalItem[]): { domain: LifeDomainCategory; percent: number }[] {
  const classified = signals.filter((s): s is TwinSignalItem & { lifeDomain: LifeDomainCategory } => s.status === 'confirmed' && s.lifeDomain != null)
  if (classified.length === 0) return []
  const counts = new Map<LifeDomainCategory, number>()
  for (const s of classified) counts.set(s.lifeDomain, (counts.get(s.lifeDomain) ?? 0) + 1)
  return [...counts.entries()]
    .map(([domain, count]) => ({ domain, percent: Math.round((count / classified.length) * 100) }))
    .sort((a, b) => b.percent - a.percent)
}

export function aggregateArchetypes(signals: TwinSignalItem[]): { archetype: Archetype; percent: number }[] {
  const classified = signals.filter((s): s is TwinSignalItem & { archetype: Archetype } => s.status === 'confirmed' && s.archetype != null)
  if (classified.length === 0) return []
  const counts = new Map<Archetype, number>()
  for (const s of classified) counts.set(s.archetype, (counts.get(s.archetype) ?? 0) + 1)
  return [...counts.entries()]
    .map(([archetype, count]) => ({ archetype, percent: Math.round((count / classified.length) * 100) }))
    .sort((a, b) => b.percent - a.percent)
}
