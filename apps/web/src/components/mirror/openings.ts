import type { MirrorEntry } from '@dpnr/shared-types'

/**
 * The three ways into a Mirror session from the landing's "Start Your
 * Reflection" (Session 69, user decision: same flow, different opening).
 * There is one Mirror flow on the backend (`mirror-steps/*.ts`); an opening
 * only changes how step 1 greets the person and what it pre-fills. Anything
 * pre-filled is plain, visible, editable text in the step's own fields, so
 * the AI sees exactly what the person kept — no hidden prompt context.
 */
export type MirrorOpening =
  | { mode: 'situation' }
  | { mode: 'pattern'; patternText: string; patternName?: string }
  | { mode: 'archetype' }

export const DEFAULT_OPENING: MirrorOpening = { mode: 'situation' }

export const TRIGGER_ARCHETYPES = ['Protector', 'Healer', 'Seeker', 'Visionary'] as const

/**
 * The entry sent with SITUATION (Session 72, #34 / Appendix B), so the AI
 * doesn't rediscover a pattern the person came in with. Consistent with the
 * rule above: a pattern or archetype counts only while the person's own
 * step-1 text still contains it. If they deleted it, the entry falls back
 * to 'situation'.
 */
export function entryFor(opening: MirrorOpening, situation: string, trigger: string, archetype?: string): MirrorEntry {
  if (opening.mode === 'pattern' && situation.includes(opening.patternText)) {
    return {
      mode: 'pattern',
      patternDescription: opening.patternText.slice(0, 1000),
      ...(opening.patternName ? { patternName: opening.patternName.slice(0, 80) } : {}),
    }
  }
  if (opening.mode === 'archetype' && archetype && trigger.includes(archetype)) {
    return { mode: 'archetype', archetype }
  }
  return { mode: 'situation' }
}

/** Rebuilds the opening from a stored entry, for resume. */
export function openingFromEntry(entry: MirrorEntry | undefined): { opening: MirrorOpening; archetype?: string } {
  if (entry?.mode === 'pattern' && entry.patternDescription) {
    return { opening: { mode: 'pattern', patternText: entry.patternDescription, patternName: entry.patternName } }
  }
  if (entry?.mode === 'archetype') return { opening: { mode: 'archetype' }, archetype: entry.archetype }
  return { opening: DEFAULT_OPENING }
}
