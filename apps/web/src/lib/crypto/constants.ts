/**
 * Crypto contract v1 — see docs/adr/0009-crypto-contract-v1.md for the full
 * rationale and the pinned test vectors these parameters must reproduce.
 * This file IS the contract: changing any value here is a wire-format
 * change. Bump ENCRYPTED_BLOB_VERSION and add a new ADR section rather than
 * editing a shipped constant in place — existing ciphertext depends on the
 * exact values below.
 */

// AES-256-GCM (content encryption — every [ENCRYPTED] field in
// MVP_ARCHITECTURE.md §3.1, per aws-migration-plan.html §6.1)
export const AES_KEY_LENGTH_BITS = 256
// 96-bit nonce — the length WebCrypto and NIST SP 800-38D recommend for GCM;
// anything else forces an internal GHASH pass that widens the misuse surface.
export const GCM_IV_LENGTH_BYTES = 12

// Argon2id KEK derivation (password path). OWASP Password Storage Cheat
// Sheet's minimum recommended Argon2id profile at parallelism=1 — chosen
// for browser-runtime cost (a WASM/JS Argon2id at higher memory becomes a
// multi-second block on low-end devices); revisit if a future session
// benchmarks real device performance and finds headroom to raise it.
export const ARGON2ID_MEMORY_KIB = 19456
export const ARGON2ID_ITERATIONS = 2
export const ARGON2ID_PARALLELISM = 1
export const ARGON2ID_OUTPUT_LENGTH_BYTES = 32 // 256-bit KEK
export const ARGON2ID_SALT_LENGTH_BYTES = 16

// HKDF (passkey-PRF KEK derivation and recovery-code KEK derivation) —
// native WebCrypto, distinct `info` strings keep the two derivations from
// ever colliding even if both were fed the same raw secret by mistake.
export const HKDF_HASH = 'SHA-256'
export const HKDF_OUTPUT_LENGTH_BITS = 256
export const HKDF_INFO_PASSKEY = 'dpnr-crypto-v1/passkey-kek'
export const HKDF_INFO_RECOVERY = 'dpnr-crypto-v1/recovery-kek'

// X25519 (the "ticketless writer" inbox keypair, aws-migration-plan.html §6.3)
export const X25519_KEY_LENGTH_BYTES = 32

// Recovery code: 160 bits of entropy, displayed as 32 base32 characters in
// 4-character groups (e.g. "ABCD-EFGH-..."). 160 bits keeps brute-force
// infeasible while staying short enough to write down by hand.
export const RECOVERY_CODE_ENTROPY_BYTES = 20
export const RECOVERY_CODE_GROUP_SIZE = 4

// Wire format. crypto-stub.ts reserves version 999_999 as a sentinel that
// can never collide with a real format version — 1 is the first real one.
export const ENCRYPTED_BLOB_VERSION = 1
