import { x25519 } from '@noble/curves/ed25519'
import { wrapKey, unwrapKey, type WrappedKey } from './dek'
import { bytesToBase64, base64ToBytes } from './encoding'

/**
 * The X25519 "ticketless writer" inbox keypair (aws-migration-plan.html
 * §6.3) — lets a job that runs outside any live session ticket (a future
 * scheduled composer, or sharing) deposit data only this user can later
 * decrypt. `publicKey` is stored plaintext (it's not a secret); the
 * private key is wrapped under the account's KEK, same as the DEK.
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

/** For `UserKeysItem.wrappedPrivateKey` — wrapped under the account KEK, same mechanism as `wrapKey`/`unwrapKey` in dek.ts. */
export async function wrapPrivateKey(privateKey: Uint8Array, kek: Uint8Array): Promise<WrappedKey> {
  return wrapKey(privateKey, kek)
}

export async function unwrapPrivateKey(wrapped: WrappedKey, kek: Uint8Array): Promise<Uint8Array> {
  return unwrapKey(wrapped, kek)
}
