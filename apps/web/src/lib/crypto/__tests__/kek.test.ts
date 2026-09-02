import { describe, expect, it } from 'vitest'
import { deriveKekFromPasskeyPrf, deriveKekFromPassword, deriveKekFromRecoveryCode, generateKekSalt } from '../kek'
import { ARGON2ID_VECTOR, HKDF_VECTOR } from './vectors'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

describe('Argon2id KEK derivation (password path) crypto contract vector', () => {
  it('reproduces the pinned KEK for a fixed password/salt', async () => {
    const kek = await deriveKekFromPassword(ARGON2ID_VECTOR.password, hexToBytes(ARGON2ID_VECTOR.saltHex))
    expect(bytesToHex(kek)).toBe(ARGON2ID_VECTOR.kekHex)
  })

  it('is deterministic: same password+salt always derives the same KEK', async () => {
    const salt = hexToBytes(ARGON2ID_VECTOR.saltHex)
    const a = await deriveKekFromPassword('a real password', salt)
    const b = await deriveKekFromPassword('a real password', salt)
    expect(bytesToHex(a)).toBe(bytesToHex(b))
  })

  it('a different password derives a different KEK from the same salt', async () => {
    const salt = hexToBytes(ARGON2ID_VECTOR.saltHex)
    const a = await deriveKekFromPassword('password one', salt)
    const b = await deriveKekFromPassword('password two', salt)
    expect(bytesToHex(a)).not.toBe(bytesToHex(b))
  })

  it('generateKekSalt returns 16 fresh random bytes each call', () => {
    const a = generateKekSalt()
    const b = generateKekSalt()
    expect(a.length).toBe(16)
    expect(bytesToHex(a)).not.toBe(bytesToHex(b))
  })
})

describe('passkey-PRF KEK derivation (HKDF) crypto contract vector', () => {
  it('reproduces the pinned HKDF output for fixed ikm/salt/info', async () => {
    const kek = await deriveKekFromPasskeyPrf(hexToBytes(HKDF_VECTOR.ikmHex), hexToBytes(HKDF_VECTOR.saltHex))
    expect(bytesToHex(kek)).toBe(HKDF_VECTOR.outHex)
  })

  it('never produces the same output as the recovery-code derivation for the same raw secret (distinct info strings)', async () => {
    const secret = hexToBytes(HKDF_VECTOR.ikmHex)
    const salt = hexToBytes(HKDF_VECTOR.saltHex)
    const passkeyKek = await deriveKekFromPasskeyPrf(secret, salt)
    const recoveryKek = await deriveKekFromRecoveryCode(secret, salt)
    expect(bytesToHex(passkeyKek)).not.toBe(bytesToHex(recoveryKek))
  })
})
