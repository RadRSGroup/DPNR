import { bytesToBase64 } from './encoding'

/**
 * Wraps a raw DEK for `POST /v1/session-ticket`, per ADR 0013 — RSA-OAEP/
 * SHA-256 against the session-ticket KMS CMK's public key (fetched via
 * `GET /v1/session-ticket/public-key`, DER/SPKI-encoded). Entirely
 * client-side: the create-ticket Lambda only ever receives this ciphertext,
 * never the raw DEK. Like the rest of this module, this function never
 * talks to the network — fetching `publicKeyDer` is the caller's job.
 */
export async function wrapDekForSessionTicket(dek: Uint8Array, publicKeyDer: Uint8Array): Promise<string> {
  const publicKey = await crypto.subtle.importKey(
    'spki',
    publicKeyDer.slice().buffer as ArrayBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
  const ciphertext = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, dek.slice().buffer as ArrayBuffer)
  return bytesToBase64(new Uint8Array(ciphertext))
}
