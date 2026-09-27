import { describe, expect, it } from 'vitest'
import { toLanguageInstruction } from './locale'

describe('toLanguageInstruction', () => {
  it('English carries no grammatical-gender instruction', () => {
    const en = toLanguageInstruction('en', 'female')
    expect(en).toMatch(/^Respond to the user entirely in English\./)
    expect(en).not.toMatch(/feminine|masculine/)
  })

  it('both languages require second person for what the person reads', () => {
    for (const locale of ['en', 'he'] as const) {
      expect(toLanguageInstruction(locale, 'male')).toMatch(/speaks to them directly, as "you"/)
      expect(toLanguageInstruction(locale, 'male')).toMatch(/never about them in the third person/)
    }
  })

  it('Hebrew mirrors the user gender in both second and first person (digital-twin voice)', () => {
    const female = toLanguageInstruction('he', 'female')
    expect(female).toMatch(/feminine grammatical forms for second-person/)
    expect(female).toMatch(/same feminine forms when referring to yourself in the first person/)
    expect(female).not.toMatch(/masculine/)
  })

  it('Hebrew falls back to masculine for both persons when gender is unspecified', () => {
    const unspecified = toLanguageInstruction('he', 'unspecified')
    expect(unspecified).toMatch(/masculine grammatical forms for second-person/)
    expect(unspecified).toMatch(/same masculine forms when referring to yourself/)
  })

  it('never introduces a template variable', () => {
    expect(toLanguageInstruction('he', 'male')).not.toMatch(/\{\{/)
  })
})
