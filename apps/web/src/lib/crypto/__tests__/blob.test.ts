import { describe, expect, it } from 'vitest'
import { aesGcmDecryptRaw, aesGcmEncryptRaw, decryptField, encryptField, importAesGcmKey } from '../blob'
import { base64ToBytes, bytesToBase64 } from '../encoding'
import { AES_GCM_VECTOR } from './vectors'

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

describe('AES-256-GCM crypto contract vector', () => {
  it('reproduces the pinned ciphertext for a fixed key/iv/plaintext', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const iv = hexToBytes(AES_GCM_VECTOR.ivHex)
    const plaintext = new TextEncoder().encode(AES_GCM_VECTOR.plaintextUtf8)
    const ciphertext = await aesGcmEncryptRaw(key, iv, plaintext)
    expect(bytesToBase64(ciphertext)).toBe(AES_GCM_VECTOR.ciphertextB64)
  })

  it('decrypts the pinned ciphertext back to the pinned plaintext', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const iv = hexToBytes(AES_GCM_VECTOR.ivHex)
    const plaintext = await aesGcmDecryptRaw(key, iv, base64ToBytes(AES_GCM_VECTOR.ciphertextB64))
    expect(new TextDecoder().decode(plaintext)).toBe(AES_GCM_VECTOR.plaintextUtf8)
  })

  it('rejects a tampered ciphertext (GCM auth tag catches it)', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const iv = hexToBytes(AES_GCM_VECTOR.ivHex)
    const tampered = base64ToBytes(AES_GCM_VECTOR.ciphertextB64)
    tampered[0] ^= 0xff
    await expect(aesGcmDecryptRaw(key, iv, tampered)).rejects.toThrow()
  })
})

describe('encryptField / decryptField (the crypto-stub.ts replacement)', () => {
  it('round-trips an arbitrary JSON-serializable value', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const value = { title: 'A real decision', options: ['A', 'B'], confidence: 0.82 }
    const blob = await encryptField(key, value)
    expect(blob.v).toBe(1)
    expect(blob.iv).toBeTruthy()
    expect(blob.ciphertext).toBeTruthy()
    // Not literally JSON.stringify(value) sitting in cleartext — the whole
    // point this replaces crypto-stub.ts for.
    expect(blob.ciphertext).not.toContain('A real decision')
    await expect(decryptField(key, blob)).resolves.toEqual(value)
  })

  it('never reuses an IV across two calls with the same key', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const a = await encryptField(key, { n: 1 })
    const b = await encryptField(key, { n: 1 })
    expect(a.iv).not.toBe(b.iv)
  })

  it('rejects a blob with an unsupported version byte', async () => {
    const key = await importAesGcmKey(hexToBytes(AES_GCM_VECTOR.keyHex))
    const blob = await encryptField(key, { n: 1 })
    await expect(decryptField(key, { ...blob, v: 999_999 })).rejects.toThrow(/Unsupported EncryptedBlob version/)
  })
})
