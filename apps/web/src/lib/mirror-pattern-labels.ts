import { useTranslations } from 'next-intl'
import { findReferencePattern, type ReferencePattern } from './mirror-patterns'

/**
 * Stable message key for a reference pattern, derived from its English name
 * ("Fixing / Rescuing" -> "fixingRescuing"). Only used to look up display
 * text under `MirrorRoom.patterns.*`.
 */
export function patternKey(name: string): string {
  const words = name.split(/[^A-Za-z]+/).filter(Boolean).map((w) => w.toLowerCase())
  return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('')
}

/**
 * Display text for the Mirror Room reference patterns (REFERENCE_PATTERNS)
 * and trigger archetypes (TRIGGER_ARCHETYPES). The stored and sent values
 * stay the English names, since they are what the backend receives
 * (`patternName`, `archetype`) and what findReferencePattern matches Twin
 * signal names against; only what is shown is translated. A name with no
 * reference entry (an AI-generated signal name, possibly already in Hebrew)
 * is shown exactly as it is.
 */
export function useMirrorPatternLabels() {
  const t = useTranslations('MirrorRoom')

  function refText(ref: ReferencePattern, field: 'name' | 'meaning' | 'showsUp'): string {
    const key = `patterns.${patternKey(ref.name)}.${field}`
    return t.has(key) ? t(key) : ref[field]
  }

  return {
    /** A pattern name as shown. Untranslated (English) names are left exactly as given. */
    name(name: string): string {
      const ref = findReferencePattern(name)
      if (!ref) return name
      const shown = refText(ref, 'name')
      // In English the entry equals the reference name; keep the signal's own spelling.
      return shown === ref.name ? name : shown
    },
    meaning: (ref: ReferencePattern | undefined) => (ref ? refText(ref, 'meaning') : undefined),
    showsUp: (ref: ReferencePattern) => refText(ref, 'showsUp'),
    archetype: (name: string) => (t.has(`archetypes.${name}`) ? t(`archetypes.${name}`) : name),
  }
}
