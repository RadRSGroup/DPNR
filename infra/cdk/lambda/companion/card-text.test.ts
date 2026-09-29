import { describe, it, expect } from 'vitest'
import { cardText } from './card-text'
import { GUIDANCE_CARD_SEEDS } from '../../scripts/guidance-cards.seed'
import { GUIDANCE_CARD_TEXT_HE } from '../../scripts/guidance-cards-he.seed'

const card = { text: 'Who are you?', textHe: { male: 'מי אתה?', female: 'מי את?' } }

describe('cardText', () => {
  it('uses the gendered Hebrew in Hebrew, masculine when gender is unspecified', () => {
    expect(cardText(card, 'he', 'female')).toBe('מי את?')
    expect(cardText(card, 'he', 'male')).toBe('מי אתה?')
    expect(cardText(card, 'he', 'unspecified')).toBe('מי אתה?')
  })

  it('uses English in English, and when a card has no Hebrew yet', () => {
    expect(cardText(card, 'en', 'female')).toBe('Who are you?')
    expect(cardText({ text: 'Who are you?' }, 'he', 'female')).toBe('Who are you?')
  })
})

describe('GUIDANCE_CARD_TEXT_HE', () => {
  it('covers every seeded card with both forms, each a question', () => {
    for (const c of GUIDANCE_CARD_SEEDS) {
      const he = GUIDANCE_CARD_TEXT_HE[c.cardId]
      expect(he, c.cardId).toBeDefined()
      for (const text of [he.male, he.female]) {
        expect(text.endsWith('?'), c.cardId).toBe(true)
        expect(text.startsWith('?'), c.cardId).toBe(false)
      }
    }
    expect(Object.keys(GUIDANCE_CARD_TEXT_HE)).toHaveLength(GUIDANCE_CARD_SEEDS.length)
  })
})
