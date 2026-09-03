import { z } from 'zod'
import { SessionTicketPurposeSchema } from '../dynamo/global-tables'

/**
 * Auth/account endpoints (MVP_ARCHITECTURE.md §4, ported from the migration
 * plan's §11 workstream 1). Cognito itself handles login/signup/token
 * issuance directly — these are the app-level operations layered on top.
 */

/**
 * POST /v1/session-ticket — establishes the bounded server-side decrypt
 * window (MVP_ARCHITECTURE.md §2.2/§6, §6.5's "one mechanism serves every
 * room and Companion chat alike"). `wrappedDek` mirrors
 * SessionTicketItem.kmsWrappedDek verbatim — per ADR 0013, it's an
 * RSA-OAEP/SHA-256 ciphertext of the raw DEK, produced entirely client-side
 * against the public key from `GET /v1/session-ticket/public-key`. The
 * create-ticket Lambda stores this verbatim and never sees the raw DEK.
 */
export const SessionTicketRequestSchema = z.object({
  wrappedDek: z.string(), // base64 RSA-OAEP/SHA-256 ciphertext, see ADR 0013
  purpose: SessionTicketPurposeSchema,
})
export type SessionTicketRequest = z.infer<typeof SessionTicketRequestSchema>

export const SessionTicketResponseSchema = z.object({
  sessionId: z.string(),
  purpose: SessionTicketPurposeSchema,
  expiresAt: z.string().datetime(),
})
export type SessionTicketResponse = z.infer<typeof SessionTicketResponseSchema>

/** DELETE /v1/auth/sessions/{id} — revokes a session ticket early ("sign out everywhere" / manual logout). */
export const RevokeSessionResponseSchema = z.object({
  revoked: z.literal(true),
})
export type RevokeSessionResponse = z.infer<typeof RevokeSessionResponseSchema>

/**
 * GET /v1/session-ticket/public-key — unauthenticated (public keys aren't
 * secret, same posture as GET /v1/health). The DER (SubjectPublicKeyInfo)
 * encoding of the session-ticket KMS CMK's RSA-2048 public key, per ADR
 * 0013 — the client imports this directly via
 * `crypto.subtle.importKey('spki', ...)` to wrap a DEK for
 * POST /v1/session-ticket without ever calling KMS itself.
 */
export const SessionTicketPublicKeyResponseSchema = z.object({
  publicKeyDer: z.string(), // base64
  keyId: z.string(),
})
export type SessionTicketPublicKeyResponse = z.infer<typeof SessionTicketPublicKeyResponseSchema>

/** PUT /v1/auth/password — Cognito performs the actual credential change; this just confirms it app-side. */
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>

export const ChangePasswordResponseSchema = z.object({
  ok: z.literal(true),
})
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>

/**
 * DELETE /v1/account — the DynamoDB half of full GDPR erasure: deletes
 * every item under the caller's USER#<id> partition (MVP_ARCHITECTURE.md
 * §8). Deliberately does NOT delete the Cognito user itself — Cognito's own
 * SDK has a genuine self-service `CognitoUser.deleteUser()` that works with
 * just the caller's own session, no admin IAM grant needed, so the client
 * calls that directly right after this succeeds (apps/web/src/lib/cognito/client.ts)
 * rather than this Lambda needing `cognito-idp:AdminDeleteUser` on itself.
 */
export const DeleteAccountResponseSchema = z.object({
  deleted: z.literal(true),
})
export type DeleteAccountResponse = z.infer<typeof DeleteAccountResponseSchema>

/**
 * GET /v1/user/export — GDPR data-export ("Download or delete anytime",
 * spec's product-system table). Every item under the caller's USER#<id>
 * partition, `[ENCRYPTED]` fields decrypted, `pk` dropped (an internal
 * storage detail, not user-facing data) and `sk` kept as an honest label
 * for which record is which. Deliberately a flat, complete dump rather than
 * a hand-curated per-feature shape — single-table design means new item
 * types (Twin signals, Companion messages, ...) show up here automatically
 * as they're built, with no export-route changes needed.
 */
export const UserExportItemSchema = z.object({ sk: z.string() }).catchall(z.unknown())
export const UserExportResponseSchema = z.object({
  exportedAt: z.string().datetime(),
  items: z.array(UserExportItemSchema),
})
export type UserExportResponse = z.infer<typeof UserExportResponseSchema>

/**
 * GET /v1/keys — the crypto envelope a returning client needs to re-derive
 * its DEK locally; never decrypted server-side. Mirrors UserKeysItem
 * verbatim minus pk/sk (API responses don't leak storage key formats).
 */
export const UserKeysResponseSchema = z.object({
  salt: z.string(),
  wrappedDek: z.string(),
  wrappedDekRecovery: z.string(),
  publicKey: z.string(),
  wrappedPrivateKey: z.string(),
})
export type UserKeysResponse = z.infer<typeof UserKeysResponseSchema>

/**
 * POST /v1/keys — identical shape to UserKeysResponseSchema (the client
 * generates every field locally and uploads only ciphertext/public
 * material; the server echoes the same shape back on both read and write),
 * so this is a direct alias rather than a duplicate schema. One-time: the
 * Lambda rejects a second call for the same user (a DEK is generated once
 * at signup and never regenerated — see apps/web/src/lib/crypto/dek.ts).
 */
export const UserKeysRequestSchema = UserKeysResponseSchema
export type UserKeysRequest = z.infer<typeof UserKeysRequestSchema>

/**
 * PUT /v1/keys — updates an existing key bundle's DEK envelope after a
 * recovery-code-based account recovery (ADR 0014). Only `wrappedDek`/
 * `wrappedDekRecovery` ever change here: a password reset re-wraps the DEK
 * under the new password's KEK, and per the project's recovery-rotation
 * decision the recovery code is rotated at the same time, so both fields are
 * always written together. `salt`/`publicKey`/`wrappedPrivateKey` are
 * immutable for the life of the account (the DEK itself never changes, so
 * wrappedPrivateKey — wrapped under the DEK, not a KEK — never needs
 * rewriting). The server never validates either ciphertext's correctness;
 * it's a plain authenticated overwrite, same trust model as every other
 * `[ENCRYPTED]`-adjacent write in this API.
 */
export const UpdateWrappedDekRequestSchema = z.object({
  wrappedDek: z.string(),
  wrappedDekRecovery: z.string(),
})
export type UpdateWrappedDekRequest = z.infer<typeof UpdateWrappedDekRequestSchema>

export const UpdateWrappedDekResponseSchema = z.object({
  ok: z.literal(true),
})
export type UpdateWrappedDekResponse = z.infer<typeof UpdateWrappedDekResponseSchema>

/**
 * POST /v1/user/consent — the write path ADR 0004 anticipated ("One write
 * path for consent... updates the PROFILE item") but that never got built
 * against the new backend (see docs/PHASE_AUDIT.md §2.2/§4.2: until this
 * existed, no code path could ever set `PROFILE.consentedAt`, so every
 * consent-gated handler would 403 forever for a real signup). No request
 * body — the server owns the current consent-copy version, the same
 * convention the old Supabase-era route used.
 */
export const CURRENT_CONSENT_VERSION = '2026-06'

export const ConsentResponseSchema = z.object({
  consentedAt: z.string().datetime(),
  consentVersion: z.string(),
})
export type ConsentResponse = z.infer<typeof ConsentResponseSchema>
