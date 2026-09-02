import { argon2idAsync } from '@noble/hashes/argon2'
import {
  ARGON2ID_ITERATIONS,
  ARGON2ID_MEMORY_KIB,
  ARGON2ID_OUTPUT_LENGTH_BYTES,
  ARGON2ID_PARALLELISM,
  ARGON2ID_SALT_LENGTH_BYTES,
  HKDF_HASH,
  HKDF_INFO_PASSKEY,
  HKDF_INFO_RECOVERY,
  HKDF_OUTPUT_LENGTH_BITS,
} from './constants'

/** A fresh random salt for a new account's Argon2id KEK derivation. Store this — the same salt must be supplied on every future sign-in to re-derive the identical KEK. */
export function generateKekSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(ARGON2ID_SALT_LENGTH_BYTES))
}

/**
 * Derives the password-path KEK. Deterministic given the same
 * password+salt — this IS the point (it must reproduce the same KEK on
 * every sign-in without the server ever seeing the password). Never send
 * `password` anywhere but this function; Cognito gets its own separate
 * auth verifier, not this value (aws-migration-plan.html §6.2).
 */
export async function deriveKekFromPassword(password: string, salt: Uint8Array): Promise<Uint8Array> {
  return argon2idAsync(new TextEncoder().encode(password), salt, {
    t: ARGON2ID_ITERATIONS,
    m: ARGON2ID_MEMORY_KIB,
    p: ARGON2ID_PARALLELISM,
    dkLen: ARGON2ID_OUTPUT_LENGTH_BYTES,
  })
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm.slice().buffer as ArrayBuffer, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: HKDF_HASH, salt: salt.slice().buffer as ArrayBuffer, info: new TextEncoder().encode(info) },
    key,
    HKDF_OUTPUT_LENGTH_BITS,
  )
  return new Uint8Array(bits)
}

/**
 * Derives the OAuth-path KEK from a WebAuthn passkey's PRF extension output
 * (aws-migration-plan.html §6.2). The PRF output is high-entropy secret
 * material from the authenticator, not a low-entropy password — HKDF
 * (rather than Argon2id) is the right primitive here, matching how the
 * recovery-code KEK below is also HKDF-derived from a high-entropy secret.
 * `salt` should be the same `KEYS.salt` used for the password path so a
 * single account has one salt regardless of which auth method set it up;
 * `HKDF_INFO_PASSKEY` (distinct from the recovery info string) keeps this
 * derivation from ever colliding with `deriveKekFromRecoveryCode`'s output
 * even if both were accidentally fed the same raw secret.
 */
export async function deriveKekFromPasskeyPrf(prfOutput: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  return hkdf(prfOutput, salt, HKDF_INFO_PASSKEY)
}

/**
 * Derives a KEK from a one-time encryption passphrase — the documented
 * fallback for an OAuth sign-in on an authenticator without PRF support.
 * Same Argon2id treatment as a real password, since a user-chosen
 * passphrase is exactly as low-entropy as a password.
 */
export async function deriveKekFromEncryptionPassphrase(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  return deriveKekFromPassword(passphrase, salt)
}

/**
 * Derives the recovery KEK from the recovery code's own raw bytes (not the
 * user-facing base32 string — decode it first). The code already carries
 * `RECOVERY_CODE_ENTROPY_BYTES` of real entropy (see recoveryCode.ts), so
 * HKDF is appropriate here the same way it is for the passkey PRF output —
 * Argon2id's slow, memory-hard design exists to blunt guessing a
 * low-entropy secret, which doesn't apply to a randomly generated code.
 */
export async function deriveKekFromRecoveryCode(recoveryCodeBytes: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  return hkdf(recoveryCodeBytes, salt, HKDF_INFO_RECOVERY)
}
