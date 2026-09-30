import { describe, it, expect } from 'vitest'
import type { EncryptedBlob } from '@dpnr/shared-types'
import { readLocalized, textLanguage } from './localized-content'
import type { SessionCrypto } from './session-crypto'

// A fake crypto whose "blobs" carry their plaintext as JSON.
const blob = (value: unknown): EncryptedBlob => ({ v: 1, iv: '', ciphertext: JSON.stringify(value) })
const crypto: SessionCrypto = {
  encryptField: async (v) => blob(v),
  decryptField: async <T,>(b: EncryptedBlob) => JSON.parse(b.ciphertext) as T,
}

describe('textLanguage', () => {
  it('is Hebrew when any text has a Hebrew letter', () => {
    expect(textLanguage({ text: 'שלום', kind: 'thought' })).toBe('he')
    expect(textLanguage({ a: ['x', { b: 'DPNR זה' }] })).toBe('he')
    expect(textLanguage({ text: 'Hello', kind: 'thought' })).toBe('en')
  })
})

describe('readLocalized', () => {
  const item = {
    content: blob({ text: 'You seem to pause before deciding.', kind: 'thought' }),
    translated: { lang: 'he' as const, content: blob({ text: 'נראה שאתם עוצרים לפני החלטה.' }) },
  }

  it('shows the translation in its language, keeping non-text fields from the original', async () => {
    expect(await readLocalized(crypto, item, 'he')).toEqual({ text: 'נראה שאתם עוצרים לפני החלטה.', kind: 'thought' })
  })

  it('shows the original in its own language, and when there is no translation', async () => {
    expect(await readLocalized(crypto, item, 'en')).toEqual({ text: 'You seem to pause before deciding.', kind: 'thought' })
    expect(await readLocalized(crypto, { content: item.content }, 'he')).toEqual({
      text: 'You seem to pause before deciding.',
      kind: 'thought',
    })
  })

  it('falls back to the original when the translation cannot be read', async () => {
    const broken = { ...item, translated: { lang: 'he' as const, content: { v: 1, iv: '', ciphertext: 'not json' } } }
    expect((await readLocalized<{ text: string }>(crypto, broken, 'he')).text).toBe('You seem to pause before deciding.')
  })
})


describe('readLocalized: mixed-language items', () => {
  it('applies a partial translation over an original that is already partly in that language', async () => {
    const mixed = {
      content: blob({ name: 'Over-Accommodation', description: 'נראה שאתם מתאימים את עצמכם.' }),
      translated: { lang: 'he' as const, content: blob({ name: 'הסתגלות יתר' }) },
    }
    expect(await readLocalized(crypto, mixed, 'he')).toEqual({ name: 'הסתגלות יתר', description: 'נראה שאתם מתאימים את עצמכם.' })
  })
})
