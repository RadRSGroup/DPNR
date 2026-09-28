import { describe, it, expect } from 'vitest'
import { entryFor, openingFromEntry, patternPrefill, type MirrorOpening } from './openings'
import { REFERENCE_PATTERNS, findReferencePattern } from '../../lib/mirror-patterns'

// Session 77 (#33 pattern selection).
describe('Mirror openings', () => {
  const own: MirrorOpening = { mode: 'pattern', patternText: 'You say yes first', patternName: 'People-Pleasing', source: 'exploring' }
  const ref: MirrorOpening = { mode: 'pattern', patternText: 'Pulling away…', patternName: 'Avoidance', source: 'reference' }

  it('sends the pattern source while the person keeps the pre-filled line', () => {
    expect(entryFor(own, patternPrefill(own) + 'at work', 't')).toEqual({
      mode: 'pattern', patternDescription: 'You say yes first', patternName: 'People-Pleasing', patternSource: 'exploring',
    })
    const refPrefill = patternPrefill(ref)
    expect(refPrefill).toContain('Avoidance')
    expect(refPrefill).not.toContain('Pulling away') // the general description isn't put into their own words
    expect(entryFor(ref, refPrefill + 'today', 't')).toMatchObject({ mode: 'pattern', patternName: 'Avoidance', patternSource: 'reference' })
  })

  it('falls back to a plain situation once the pattern line is removed', () => {
    expect(entryFor(ref, 'Something happened at dinner', 't')).toEqual({ mode: 'situation' })
  })

  it('carries "help me notice" through submit and resume', () => {
    const help: MirrorOpening = { mode: 'situation', helpIdentify: true }
    const entry = entryFor(help, 's', 't')
    expect(entry).toEqual({ mode: 'situation', helpIdentify: true })
    expect(openingFromEntry(entry).opening).toEqual(help)
  })

  it('round-trips the source on resume, and leaves a legacy entry without one', () => {
    expect(openingFromEntry({ mode: 'pattern', patternDescription: 'd', patternName: 'X', patternSource: 'reference' }).opening)
      .toMatchObject({ source: 'reference' })
    const legacy = openingFromEntry({ mode: 'pattern', patternDescription: 'd' }).opening
    expect(legacy).toMatchObject({ mode: 'pattern' })
    expect(entryFor(legacy, patternPrefill(legacy as Extract<MirrorOpening, { mode: 'pattern' }>), 't')).not.toHaveProperty('patternSource')
  })

  it('has the 21 Appendix A patterns, each fitting the entry limits', () => {
    expect(REFERENCE_PATTERNS).toHaveLength(21)
    for (const p of REFERENCE_PATTERNS) {
      expect(p.name.length).toBeLessThanOrEqual(80)
      expect(p.meaning.length).toBeLessThanOrEqual(1000)
      expect(p.showsUp).toMatch(/^You might notice it when /)
    }
    expect(findReferencePattern('people pleasing')?.name).toBe('People-Pleasing')
    expect(findReferencePattern(undefined)).toBeUndefined()
  })
})
