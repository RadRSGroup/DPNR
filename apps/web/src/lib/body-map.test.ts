import { describe, it, expect } from 'vitest'
import { feltFromDecisionEmotion, EMPTY_FELT } from './body-map'

/** Slice 5b: pre-body-map decisions must resume and review without inventing anything. */
describe('feltFromDecisionEmotion', () => {
  const legacy = { bodyLocation: 'Chest', emotionColor: 'Fear' }

  it('turns a palette emotion on a map area into a placed chip', () => {
    const f = feltFromDecisionEmotion(legacy)
    expect(f.emotionsFelt).toEqual([{ label: 'Fear', color: expect.stringMatching(/^#[0-9a-f]{6}$/i) }])
    expect(f.bodyPlacements).toEqual([{ area: 'Chest', emotion: 'Fear' }])
    expect([f.emotion, f.bodyResponse]).toEqual(['', ''])
  })

  it('keeps a typed-in emotion as their own words', () => {
    const f = feltFromDecisionEmotion({ bodyLocation: 'Chest', emotionColor: 'restless' })
    expect(f).toEqual({ emotionsFelt: [], bodyPlacements: [], emotion: 'restless', bodyResponse: 'Chest' })
  })

  it('uses the structured capture when present', () => {
    const f = feltFromDecisionEmotion({
      ...legacy,
      emotionsFelt: [{ label: 'Hope', color: '#22c55e' }],
      bodyPlacements: [{ area: 'Hands', emotion: 'Hope' }],
      bodyWords: 'warm',
    })
    expect(f).toEqual({ emotionsFelt: [{ label: 'Hope', color: '#22c55e' }], bodyPlacements: [{ area: 'Hands', emotion: 'Hope' }], emotion: '', bodyResponse: 'warm' })
  })

  it('is empty for no emotion item', () => {
    expect(feltFromDecisionEmotion(null)).toBe(EMPTY_FELT)
  })
})
