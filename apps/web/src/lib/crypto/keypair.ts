import { x25519 } from '@noble/curves/ed25519'
import { wrapKey, unwrapKey, type WrappedKey } from './dek'
import { bytesToBase64, base64ToBytes } from './encoding'

/**
 * The X25519 "ticketless writer" inbox keypair (aws-migration-plan.html
 * §6.3) — lets a job that runs outside any live session ticket (a future
 * scheduled composer, or sharing) deposit data only this user can later
 * decrypt. `publicKey` is stored plaintext (it's not a secret); the
 * private key is wrapped under the raw DEK itself (ADR 0014), not a KEK —
 * so it's uniformly recoverable via either the password path
 * (wrappedDek) or the recovery-code path (wrappedDekRecovery), since both
 * unwrap to the same DEK. A password reset only ever needs to re-wrap the
 * DEK, never this key.
 */
export interface InboxKeypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export function generateInboxKeypair(): InboxKeypair {
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return { privateKey, publicKey }
}

/** For the `UserKeysItem.publicKey` field — plaintext, base64. */
export function encodePublicKey(publicKey: Uint8Array): string {
  return bytesToBase64(publicKey)
}

export function decodePublicKey(encoded: string): Uint8Array {
  return base64ToBytes(encoded)
}

/**
 * For `UserKeysItem.wrappedPrivateKey` — same mechanism as `wrapKey`/`unwrapKey`
 * in dek.ts, but the caller passes the raw DEK as the wrapping key, not a
 * KEK (ADR 0014). The parameter is still named generically (`wrapKey`'s own
 * signature doesn't distinguish a DEK from a KEK — both are just 32 random
 * bytes to AES-GCM), but every real call site in this codebase must pass
 * the DEK here.
 */
export async function wrapPrivateKey(privateKey: Uint8Array, dek: Uint8Array): Promise<WrappedKey> {
  return wrapKey(privateKey, dek)
}

export async function unwrapPrivateKey(wrapped: WrappedKey, dek: Uint8Array): Promise<Uint8Array> {
  return unwrapKey(wrapped, dek)
}
