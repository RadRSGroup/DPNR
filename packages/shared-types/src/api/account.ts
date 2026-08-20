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
 * SessionTicketItem.kmsWrappedDek verbatim — the client re-wraps its DEK
 * against the session-ticket KMS CMK's public key locally before this ever
 * leaves the client, so the server only ever receives ciphertext here.
 * NOTE: the exact wrap algorithm/CMK key spec isn't locked down yet — this
 * shape mirrors the already-committed SessionTicketItem fields, but the
 * handshake itself needs a security-review pass before the Lambda is built
 * (AGENT_LOG.md guardrail: anything touching encryption gets one).
 */
export const SessionTicketRequestSchema = z.object({
  wrappedDek: z.string(), // base64, pre-wrapped client-side — see note above
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
