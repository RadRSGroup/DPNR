import { AES_KEY_LENGTH_BITS, GCM_IV_LENGTH_BYTES } from './constants'
import { aesGcmDecryptRaw, aesGcmEncryptRaw, importAesGcmKey } from './blob'
import { base64ToBytes, bytesToBase64 } from './encoding'

/** A `wrapped_DEK`-shaped value: an IV-prefixed AES-GCM ciphertext of the raw DEK bytes, base64-encoded as one string for storage in a `UserKeysItem` field (`wrappedDek`/`wrappedDekRecovery`, packages/shared-types/src/dynamo/account.ts). */
export type WrappedKey = string

/** Generates a fresh random DEK — one per account, created once at signup and never regenerated (regenerating it would orphan every previously-encrypted field). */
export function generateDek(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(AES_KEY_LENGTH_BITS / 8))
}

/** Wraps a raw key's bytes (a DEK, or an X25519 private key) under a KEK: AES-GCM-encrypt the bytes, prepend the IV, base64 the result. Used for `wrappedDek`, `wrappedDekRecovery`, and `wrappedPrivateKey` alike — the wrapping mechanism is the same for all three, they differ only in what KEK unwraps them. */
export async function wrapKey(rawKeyBytes: Uint8Array, kek: Uint8Array): Promise<WrappedKey> {
  const kekKey = await importAesGcmKey(kek)
  const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES))
  const ciphertext = await aesGcmEncryptRaw(kekKey, iv, rawKeyBytes)
  const combined = new Uint8Array(iv.length + ciphertext.length)
  combined.set(iv, 0)
  combined.set(ciphertext, iv.length)
  return bytesToBase64(combined)
}

/** Inverse of `wrapKey`. Throws (via WebCrypto's own GCM tag check) if `kek` is wrong — e.g. a stale password after a change nobody re-wrapped for. */
export async function unwrapKey(wrapped: WrappedKey, kek: Uint8Array): Promise<Uint8Array> {
  const kekKey = await importAesGcmKey(kek)
  const combined = base64ToBytes(wrapped)
  const iv = combined.slice(0, GCM_IV_LENGTH_BYTES)
  const ciphertext = combined.slice(GCM_IV_LENGTH_BYTES)
  return aesGcmDecryptRaw(kekKey, iv, ciphertext)
}
