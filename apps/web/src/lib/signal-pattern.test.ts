import { describe, it, expect } from 'vitest'
import { REFERENCE_PATTERN_NAMES } from '@dpnr/shared-types'
import { REFERENCE_PATTERNS, findSignalPattern, uniquePatterns } from './mirror-patterns'

describe('findSignalPattern', () => {
  it('finds the pattern by its id when the name is in Hebrew', () => {
    expect(findSignalPattern({ name: 'ריצוי', referencePattern: 'People-Pleasing' })?.name).toBe('People-Pleasing')
  })

  it('falls back to the name for signals without an id', () => {
    expect(findSignalPattern({ name: 'people pleasing' })?.name).toBe('People-Pleasing')
    expect(findSignalPattern({ name: 'ריצוי' })).toBeUndefined()
  })

  it('shows a pattern once even when one copy is named in Hebrew', () => {
    const shown = uniquePatterns([
      { name: 'People-Pleasing', description: 'a' },
      { name: 'ריצוי', referencePattern: 'People-Pleasing', description: 'b' },
    ])
    expect(shown.map((s) => s.description)).toEqual(['a'])
  })
})

describe('REFERENCE_PATTERN_NAMES', () => {
  it('matches Mirror Room reference patterns exactly, in order', () => {
    expect([...REFERENCE_PATTERN_NAMES]).toEqual(REFERENCE_PATTERNS.map((p) => p.name))
  })
})
