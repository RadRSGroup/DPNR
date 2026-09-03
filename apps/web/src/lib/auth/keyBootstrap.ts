import {
  generateKekSalt,
  deriveKekFromPassword,
  deriveKekFromRecoveryCode,
  generateDek,
  wrapKey,
  unwrapKey,
  generateInboxKeypair,
  encodePublicKey,
  wrapPrivateKey,
  generateRecoveryCode,
  parseRecoveryCode,
  base64ToBytes,
  bytesToBase64,
  wrapDekForSessionTicket,
  type RecoveryCode,
} from '../crypto'
import {
  createUserKeys,
  getUserKeys,
  updateWrappedDek,
  getSessionTicketPublicKey,
  createSessionTicket,
  revokeSession,
  ApiError,
} from '../api/v1-client'
import { storeSessionTicketId, takeStoredSessionTicketId } from '../cognito/client'

/**
 * Phase 6 Stage 3 (docs/AGENT_LOG.md, ADR 0014) — composes the pure crypto
 * module (`lib/crypto/`, deliberately network-free) with the `/v1` API
 * client to bootstrap, use, and recover an account's key bundle. Kept out
 * of `lib/crypto/` itself so that module's own "never talks to the
 * network" invariant (its `index.ts` doc comment) stays true, and out of
 * `lib/cognito/client.ts` so that stays purely about Cognito.
 */

/**
 * Generates a brand-new key bundle at signup and uploads it via
 * `POST /v1/keys`. Must be called with the user's real password — this is
 * the only moment the password is fed into Argon2id for this account's KEK.
 * Returns the recovery code for the mandatory one-time reveal screen (ADR
 * 0001 — "not optional polish"), or `null` if a key bundle already existed
 * (a retried call after an earlier attempt already succeeded and already
 * showed the real code) — the caller must NOT fabricate a code to show in
 * that case, since it wouldn't match what's actually stored.
 */
export async function bootstrapKeysAtSignup(password: string): Promise<RecoveryCode | null> {
  const salt = generateKekSalt()
  const dek = generateDek()
  const recoveryCode = generateRecoveryCode()
  const keypair = generateInboxKeypair()

  const passwordKek = await deriveKekFromPassword(password, salt)
  const recoveryKek = await deriveKekFromRecoveryCode(recoveryCode.bytes, salt)

  const wrappedDek = await wrapKey(dek, passwordKek)
  const wrappedDekRecovery = await wrapKey(dek, recoveryKek)
  // Private key wrapped under the raw DEK, not a KEK (ADR 0014) — see keypair.ts.
  const wrappedPrivateKey = await wrapPrivateKey(keypair.privateKey, dek)

  try {
    await createUserKeys({
      salt: bytesToBase64(salt),
      wrappedDek,
      wrappedDekRecovery,
      publicKey: encodePublicKey(keypair.publicKey),
      wrappedPrivateKey,
    })
  } catch (err) {
    if (err instanceof ApiError && err.code === 'keys_already_exist') {
      return null
    }
    throw err
  }

  return recoveryCode
}

/**
 * Fetches the caller's key bundle, re-derives the DEK from `password`, and
 * establishes real `active_session` + `post_session` session tickets — the
 * interactive Lambdas (Rooms/Companion/Twin) consume the former via Stage
 * 4a's `getSessionCrypto`; the Continuity composer pipeline is meant to
 * consume the latter once it's converted (Stage 4b, not built yet, but
 * cheap to wire the ticket for now since it's the same already-wrapped DEK).
 * Best-effort by design: a missing key bundle is not an error here — `null`
 * covers both "no key bundle exists yet" (an account created before Stage
 * 3, or signup's own bootstrap step never completed) and is the signal for
 * callers to treat this as a no-op. A real crypto failure (e.g.
 * `unwrapKey` rejecting a stale `wrappedDek` after some other bug) still
 * throws — callers should swallow that too rather than block a sign-in on
 * it (this is a convenience mechanism, not the authentication boundary).
 * Returns the `active_session` ticket's id (what sign-out revokes) — the
 * `post_session` ticket deliberately outlives the tab and isn't tracked
 * for revocation the same way.
 */
export async function establishSessionTicket(password: string): Promise<string | null> {
  let keys
  try {
    keys = await getUserKeys()
  } catch (err) {
    if (err instanceof ApiError && err.code === 'keys_not_found') {
      return null
    }
    throw err
  }

  const salt = base64ToBytes(keys.salt)
  const kek = await deriveKekFromPassword(password, salt)
  // Doubles as a real password/KEK consistency check: a mismatch here means
  // something upstream is broken (Cognito already authenticated separately).
  const dek = await unwrapKey(keys.wrappedDek, kek)

  const { publicKeyDer } = await getSessionTicketPublicKey()
  // Wrapping the same DEK once is reusable for both tickets — RSA-OAEP
  // wrapping isn't purpose-specific, only the resulting DynamoDB item is.
  const wrappedDekForTicket = await wrapDekForSessionTicket(dek, base64ToBytes(publicKeyDer))
  const ticket = await createSessionTicket({ wrappedDek: wrappedDekForTicket, purpose: 'active_session' })
  storeSessionTicketId(ticket.sessionId)
  await createSessionTicket({ wrappedDek: wrappedDekForTicket, purpose: 'post_session' })
  return ticket.sessionId
}

/**
 * Revokes whichever session ticket `establishSessionTicket` last created in
 * this tab, if any — call this right before `signOut()`. A no-op if no
 * ticket was ever created (e.g. `establishSessionTicket` returned `null` or
 * was never called), and best-effort like everything else session-ticket
 * related today: nothing consumes tickets server-side until Stage 4, so a
 * failed revoke here just means the ticket sits until its own TTL expires.
 */
export async function revokeCurrentSessionTicket(): Promise<void> {
  const sessionId = takeStoredSessionTicketId()
  if (!sessionId) return
  await revokeSession(sessionId)
}

/**
 * Recovers DEK access via the recovery code and re-wraps it under a freshly
 * chosen password's KEK — the account-recovery path for "forgot password."
 * Must be called already-authenticated (i.e. after the Cognito password
 * reset completes and the caller signs in with `newPassword`). Per the
 * project's recovery-rotation decision, a successful recovery also rotates
 * the recovery code itself: a fresh one is generated, and both
 * `wrappedDek`/`wrappedDekRecovery` are written together via
 * `PUT /v1/keys`. `wrappedPrivateKey` is untouched — the DEK itself never
 * changes, only which KEKs wrap it (ADR 0014).
 *
 * Throws on a malformed or wrong recovery code (from `parseRecoveryCode` or
 * `unwrapKey`'s GCM tag check respectively) — callers should show a single
 * "check the code and try again" message either way, not a generic error,
 * and let the user retry without redoing the Cognito password-reset step.
 * Also throws `ApiError` with code `keys_not_found` if no key bundle exists
 * for this account at all — callers should treat that as "nothing to
 * recover" rather than a bad-code error.
 */
export async function recoverAndRewrapDek(recoveryCodeInput: string, newPassword: string): Promise<RecoveryCode> {
  const keys = await getUserKeys()
  const salt = base64ToBytes(keys.salt)

  const recoveryBytes = parseRecoveryCode(recoveryCodeInput)
  const recoveryKek = await deriveKekFromRecoveryCode(recoveryBytes, salt)
  const dek = await unwrapKey(keys.wrappedDekRecovery, recoveryKek)

  const newPasswordKek = await deriveKekFromPassword(newPassword, salt)
  const newWrappedDek = await wrapKey(dek, newPasswordKek)

  const newRecoveryCode = generateRecoveryCode()
  const newRecoveryKek = await deriveKekFromRecoveryCode(newRecoveryCode.bytes, salt)
  const newWrappedDekRecovery = await wrapKey(dek, newRecoveryKek)

  await updateWrappedDek({ wrappedDek: newWrappedDek, wrappedDekRecovery: newWrappedDekRecovery })

  return newRecoveryCode
}
