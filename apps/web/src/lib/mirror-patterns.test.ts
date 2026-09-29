import { describe, it, expect } from 'vitest'
import { uniquePatterns } from './mirror-patterns'

const sig = (id: string, name: string | undefined, description = `d-${id}`) => ({ id, name, description })

describe('uniquePatterns', () => {
  it('keeps the first of each name, ignoring case and punctuation', () => {
    const out = uniquePatterns([sig('1', 'People-Pleasing'), sig('2', 'people pleasing'), sig('3', 'Avoidance')])
    expect(out.map((s) => s.id)).toEqual(['1', '3'])
  })

  it('falls back to the description when there is no name', () => {
    const out = uniquePatterns([sig('1', undefined, 'Says yes too fast'), sig('2', undefined, 'says yes too fast.')])
    expect(out.map((s) => s.id)).toEqual(['1'])
  })

  it('treats Hebrew names as distinct and deduplicates them', () => {
    const out = uniquePatterns([sig('1', 'ריצוי'), sig('2', 'הימנעות'), sig('3', 'ריצוי')])
    expect(out.map((s) => s.id)).toEqual(['1', '2'])
  })
})
