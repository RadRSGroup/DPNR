import type { MirrorEntry, MirrorPatternSource } from '@dpnr/shared-types'

/**
 * The three ways into a Mirror session from the landing's "Start Your
 * Reflection" (Session 69, user decision: same flow, different opening).
 * There is one Mirror flow on the backend (`mirror-steps/*.ts`); an opening
 * only changes how step 1 greets the person and what it pre-fills. Anything
 * pre-filled is plain, visible, editable text in the step's own fields, so
 * the AI sees exactly what the person kept — no hidden prompt context.
 *
 * Session 77 (#33): a pattern opening says where the pattern came from
 * (`source`), and a situation opening can carry `helpIdentify` when the
 * person asked DPNR to help notice what may be happening.
 */
export type MirrorOpening =
  | { mode: 'situation'; helpIdentify?: boolean }
  | { mode: 'pattern'; patternText: string; patternName?: string; source?: MirrorPatternSource }
  | { mode: 'archetype' }

export const DEFAULT_OPENING: MirrorOpening = { mode: 'situation' }

export const TRIGGER_ARCHETYPES = ['Protector', 'Healer', 'Seeker', 'Visionary'] as const

/**
 * The pre-fill in the person's language (Step01Situation passes it from
 * `MirrorRoom.step1.prefill*`). `reference` gets the English name and is
 * expected to show its translated name; `own` gets the signal's own text.
 */
export interface PrefillCopy {
  reference: (patternName: string) => string
  own: (patternText: string) => string
}

/**
 * The anchors as the person saw them (a translated reference-pattern or
 * archetype name). Either the stored English anchor or its shown form keeps
 * the entry, so a pre-fill written in Hebrew still counts.
 */
export interface ShownAnchors {
  patternName?: string
  archetype?: string
}

/**
 * What step 1 pre-fills for a pattern opening. The person's own reading
 * (their Twin signal) is quoted; a reference pattern is named — its general
 * description isn't about them, so it isn't written into their own words.
 */
export function patternPrefill(opening: Extract<MirrorOpening, { mode: 'pattern' }>, copy?: PrefillCopy): string {
  if (copy) {
    return opening.source === 'reference'
      ? copy.reference(opening.patternName ?? opening.patternText)
      : copy.own(opening.patternText)
  }
  if (opening.source === 'reference') {
    return `A pattern that may be showing up for me: ${opening.patternName ?? opening.patternText}

A recent moment I noticed it: `
  }
  return `A pattern I keep noticing: "${opening.patternText}"

A recent moment it showed up: `
}

/** The text that must still be in step 1 for the pattern to count (see entryFor). */
function patternAnchor(opening: Extract<MirrorOpening, { mode: 'pattern' }>): string {
  return opening.source === 'reference' ? (opening.patternName ?? opening.patternText) : opening.patternText
}

/**
 * The entry sent with SITUATION (Session 72, #34 / Appendix B), so the AI
 * doesn't rediscover a pattern the person came in with. Consistent with the
 * rule above: a pattern or archetype counts only while the person's own
 * step-1 text still contains it. If they deleted it, the entry falls back
 * to 'situation'.
 */
export function entryFor(opening: MirrorOpening, situation: string, trigger: string, archetype?: string, shown?: ShownAnchors): MirrorEntry {
  const shownPattern = opening.mode === 'pattern' && opening.source === 'reference' ? shown?.patternName : undefined
  if (opening.mode === 'pattern' && (situation.includes(patternAnchor(opening)) || (!!shownPattern && situation.includes(shownPattern)))) {
    return {
      mode: 'pattern',
      patternDescription: opening.patternText.slice(0, 1000),
      ...(opening.patternName ? { patternName: opening.patternName.slice(0, 80) } : {}),
      ...(opening.source ? { patternSource: opening.source } : {}),
    }
  }
  if (opening.mode === 'archetype' && archetype && (trigger.includes(archetype) || (!!shown?.archetype && trigger.includes(shown.archetype)))) {
    return { mode: 'archetype', archetype }
  }
  if (opening.mode === 'situation' && opening.helpIdentify) return { mode: 'situation', helpIdentify: true }
  return { mode: 'situation' }
}

/** Rebuilds the opening from a stored entry, for resume. */
export function openingFromEntry(entry: MirrorEntry | undefined): { opening: MirrorOpening; archetype?: string } {
  if (entry?.mode === 'pattern' && entry.patternDescription) {
    return {
      opening: {
        mode: 'pattern',
        patternText: entry.patternDescription,
        patternName: entry.patternName,
        // Absent on pre-Session-77 entries; left absent so a resubmit keeps
        // the legacy wording rather than claiming "confirmed".
        source: entry.patternSource,
      },
    }
  }
  if (entry?.mode === 'archetype') return { opening: { mode: 'archetype' }, archetype: entry.archetype }
  if (entry?.helpIdentify) return { opening: { mode: 'situation', helpIdentify: true } }
  return { opening: DEFAULT_OPENING }
}
