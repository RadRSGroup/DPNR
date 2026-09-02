/**
 * Base64 <-> Uint8Array, deliberately built on btoa/atob rather than
 * Buffer. This module runs in the browser (it's the client-side half of
 * the zero-knowledge design, aws-migration-plan.html §6) — btoa/atob is
 * the one binary-safe encoding primitive available both there and in this
 * repo's Node-based test runner, without pulling a Node-only API into a
 * client bundle.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 base32, no padding — used for the recovery code (easier to transcribe by hand than base64: no mixed case, no punctuation ambiguity). */
export function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}
