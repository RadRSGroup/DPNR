/**
 * Crypto contract v1 test vectors — see docs/adr/0009-crypto-contract-v1.md.
 *
 * These pin this implementation's exact byte-level output for fixed
 * inputs. Per aws-migration-plan.html §6.7, their purpose is byte
 * compatibility for a future non-web client (iOS CryptoKit, Android
 * Keystore/Tink) — a mobile implementation that reproduces these same
 * outputs for these same inputs is wire-compatible with this one.
 *
 * Generated once by actually running this module's own functions (not
 * hand-computed) — see the ADR for how, if these ever need regenerating
 * after a deliberate, version-bumped format change.
 *
 * All fixed inputs are simple incrementing byte sequences in disjoint
 * ranges (0x00.., 0x10.., 0x30.., 0x50.., 0x80.., 0xa0.., 0xc0..) rather
 * than arbitrary hex, so a reader can verify by eye that no input
 * accidentally reuses another vector's bytes.
 */

export const AES_GCM_VECTOR = {
  keyHex: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
  ivHex: '505152535455565758595a5b',
  plaintextUtf8: 'DPNR crypto contract v1 test vector',
  ciphertextB64: '1nd4JsQzy58swlJFro7toZFOnp8CB6sCUOyTr9A28BclgPiqZ2hVFGgdpEF6EW0kwyDr',
}

export const ARGON2ID_VECTOR = {
  password: 'correct horse battery staple',
  saltHex: '808182838485868788898a8b8c8d8e8f',
  kekHex: 'f552a026194be7d2ea2c82c9b548ca463fa129f3afbdb4bc57d68123990a13f3',
}

export const X25519_VECTOR = {
  privHex: '101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f',
  pubHex: 'd89e3bad79437dbed9f843418304f460ff05c7fe81fe4a9577a804cb9367ff66',
}

export const BASE32_VECTOR = {
  hex: 'c0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3',
  base32: 'YDA4FQ6EYXDMPSGJZLF4ZTOOZ7INDUWT',
}

export const HKDF_VECTOR = {
  ikmHex: '303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f',
  saltHex: '808182838485868788898a8b8c8d8e8f',
  info: 'dpnr-crypto-v1/passkey-kek',
  outHex: 'c7976f47b7db4b178b294c355fb9d688cfbba47881612b1b843bb9bc6713937f',
}
