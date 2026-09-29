import { describe, it, expect } from 'vitest'
import { DPNR_METHOD, getMethod, getMethodPiece } from './method-content'
import { DPNR_METHOD_HE } from './method-content.he'

describe('DPNR Method Hebrew edition', () => {
  it('mirrors the English pieces: same order, slugs, images and structure', () => {
    expect(DPNR_METHOD_HE.map((p) => p.slug)).toEqual(DPNR_METHOD.map((p) => p.slug))
    DPNR_METHOD.forEach((en, i) => {
      const he = DPNR_METHOD_HE[i]
      expect(he.image).toBe(en.image)
      expect(he.relatedTopics.map((r) => r.slug)).toEqual(en.relatedTopics.map((r) => r.slug))
      expect(he.sections.length).toBe(en.sections.length)
      en.sections.forEach((s, j) => {
        const h = he.sections[j]
        expect(Boolean(h.heading)).toBe(Boolean(s.heading))
        expect(h.paragraphs?.length).toBe(s.paragraphs?.length)
        expect(h.bullets?.length).toBe(s.bullets?.length)
        expect(h.steps?.length).toBe(s.steps?.length)
      })
    })
  })

  it('selects by locale, English as the fallback', () => {
    expect(getMethod('he')).toBe(DPNR_METHOD_HE)
    expect(getMethod('en')).toBe(DPNR_METHOD)
    expect(getMethod('fr')).toBe(DPNR_METHOD)
    expect(getMethodPiece('asking-why', 'he')?.title).toBe(DPNR_METHOD_HE[3].title)
    expect(getMethodPiece('asking-why')?.title).toBe(DPNR_METHOD[3].title)
  })
})
