import { describe, expect, it } from 'vitest'
import { bytesToBase32 } from '../encoding'
import { generateRecoveryCode, parseRecoveryCode } from '../recoveryCode'
import { BASE32_VECTOR } from './vectors'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

describe('base32 crypto contract vector', () => {
  it('reproduces the pinned base32 encoding for fixed bytes', () => {
    expect(bytesToBase32(hexToBytes(BASE32_VECTOR.hex))).toBe(BASE32_VECTOR.base32)
  })
})

describe('recovery code generation and parsing', () => {
  it('generates 20 bytes of entropy and a matching grouped display string', () => {
    const { bytes, display } = generateRecoveryCode()
    expect(bytes.length).toBe(20)
    expect(display).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){7}$/)
  })

  it('parseRecoveryCode inverts generateRecoveryCode, formatting differences and all', () => {
    const { bytes, display } = generateRecoveryCode()
    expect(parseRecoveryCode(display)).toEqual(bytes)
    // A user retyping it lowercase, with extra spaces, or without dashes must still work.
    expect(parseRecoveryCode(display.toLowerCase().replace(/-/g, ' '))).toEqual(bytes)
  })

  it('rejects a code with an invalid character', () => {
    expect(() => parseRecoveryCode('0000-1111-2222-3333-4444-5555-6666-7777')).toThrow(/unexpected character/)
  })

  it('rejects a code of the wrong length', () => {
    expect(() => parseRecoveryCode('ABCD-EFGH')).toThrow(/expected 20 bytes/)
  })

  it('two generated codes are never the same', () => {
    const a = generateRecoveryCode()
    const b = generateRecoveryCode()
    expect(a.display).not.toBe(b.display)
  })
})
