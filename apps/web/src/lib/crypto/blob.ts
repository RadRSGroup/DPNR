import type { EncryptedBlob } from '@dpnr/shared-types'
import { AES_KEY_LENGTH_BITS, ENCRYPTED_BLOB_VERSION, GCM_IV_LENGTH_BYTES } from './constants'
import { base64ToBytes, bytesToBase64 } from './encoding'

/** Imports a raw 32-byte key (a DEK) as a non-extractable WebCrypto AES-GCM key. */
export async function importAesGcmKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey.slice().buffer as ArrayBuffer, { name: 'AES-GCM', length: AES_KEY_LENGTH_BITS }, false, [
    'encrypt',
    'decrypt',
  ])
}

/**
 * Low-level, deterministic given a fixed `iv` — this is the function the
 * crypto-contract test vectors pin (docs/adr/0009-crypto-contract-v1.md).
 * `encryptField` below is NOT vector-tested directly, since it generates a
 * fresh random IV on every call by design (reusing an IV under the same
 * key breaks GCM's confidentiality guarantee) — its correctness is instead
 * verified by round-trip tests.
 */
export async function aesGcmEncryptRaw(key: CryptoKey, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv.slice().buffer as ArrayBuffer }, key, plaintext.slice().buffer as ArrayBuffer)
  return new Uint8Array(ciphertext)
}

export async function aesGcmDecryptRaw(key: CryptoKey, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv.slice().buffer as ArrayBuffer }, key, ciphertext.slice().buffer as ArrayBuffer)
  return new Uint8Array(plaintext)
}

/**
 * Encrypts an arbitrary JSON-serializable value into the wire `EncryptedBlob`
 * shape (`@dpnr/shared-types`'s `EncryptedBlobSchema` — the shape
 * `crypto-stub.ts` already fakes today, so this is a drop-in replacement
 * for its internals, not a caller-facing contract change). `tag` is left
 * unset: WebCrypto's AES-GCM appends the auth tag to the ciphertext output
 * itself, so there's nothing separate to carry.
 */
export async function encryptField<T>(key: CryptoKey, value: T): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await aesGcmEncryptRaw(key, iv, plaintext)
  return { v: ENCRYPTED_BLOB_VERSION, iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) }
}

export async function decryptField<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  if (blob.v !== ENCRYPTED_BLOB_VERSION) {
    throw new Error(`Unsupported EncryptedBlob version ${blob.v} (expected ${ENCRYPTED_BLOB_VERSION})`)
  }
  const iv = base64ToBytes(blob.iv)
  const ciphertext = base64ToBytes(blob.ciphertext)
  const plaintext = await aesGcmDecryptRaw(key, iv, ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
