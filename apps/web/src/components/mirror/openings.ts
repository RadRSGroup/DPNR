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
  | { mode: 'pattern'; patternText: string }
  | { mode: 'archetype' }

export const DEFAULT_OPENING: MirrorOpening = { mode: 'situation' }

export const TRIGGER_ARCHETYPES = ['Protector', 'Healer', 'Seeker', 'Visionary'] as const
