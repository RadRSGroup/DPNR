import { describe, expect, it } from 'vitest'
import { toLanguageInstruction } from './locale'

describe('toLanguageInstruction', () => {
  it('English carries no grammatical-gender instruction', () => {
    expect(toLanguageInstruction('en', 'female')).toBe('Respond to the user entirely in English.')
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
