import { z } from 'zod'
import { SessionTicketPurposeSchema } from '../dynamo/global-tables'
import { GenderIdentitySchema, ChatBackgroundSchema } from '../dynamo/account'

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
 * PUT /v1/keys — updates an existing key bundle's DEK envelope after either
 * a recovery-code-based account recovery (ADR 0014) or a direct signed-in
 * password change (`lib/auth/keyBootstrap.ts`'s `recoverAndRewrapDek`/
 * `changePasswordAndRewrapDek` respectively — same endpoint, same request
 * shape, different caller). Only `wrappedDek`/`wrappedDekRecovery` ever
 * change here. Recovery re-wraps the DEK under the new password's KEK *and*
 * rotates the recovery code (the project's recovery-rotation decision); a
 * plain password change also re-wraps the DEK but leaves the recovery code
 * itself untouched — `wrappedDekRecovery` is sent back unchanged in that
 * case, not omitted, since both fields are always required here regardless
 * of which caller it is. `salt`/`publicKey`/`wrappedPrivateKey` are
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

/**
 * PUT /v1/user/preferences — the write path `preferredLanguage`/
 * `genderIdentity` never had (docs/HEBREW_LOCALIZATION_PLAN.md Slice B).
 * Neither Cognito custom attribute is an option here: they can't be added
 * to an already-live User Pool without recreating it, so both fields live
 * on the DynamoDB `PROFILE` item and are only ever written through this
 * endpoint. All fields optional and independently settable — the
 * language selector calls this with only `preferredLanguage`, the
 * dedicated post-signin profile-setup screen calls it with `genderIdentity`/
 * `avatarKey`/`profileSetupComplete` together, and the Account settings
 * page calls it with just one field at a time. At least one must be
 * present (an empty-object call is a client bug, not a valid no-op
 * request).
 *
 * `avatarKey` is the S3 object key from `POST /v1/user/avatar/upload-url`
 * (never a URL — the bucket is private, `GET /v1/user/preferences`
 * generates a fresh presigned `avatarUrl` on every read instead). `null`
 * explicitly clears a previously-set photo (removing the field entirely
 * would be indistinguishable from "don't touch this field").
 *
 * `profileSetupComplete` (write-only, always `true` when present — see
 * `docs/AGENT_LOG.md` Session 51) marks the one-time post-signin
 * profile-setup screen (gender + optional photo) as done, whether the
 * user filled it in or explicitly skipped it — this is what stops
 * `proxy.ts`'s gate from showing it again.
 */
/** Session 70 — the profile's `firstName` cap. */
export const PREFERRED_NAME_MAX_LENGTH = 40

export const UpdatePreferencesRequestSchema = z
  .object({
    preferredLanguage: z.enum(['en', 'he']).optional(),
    genderIdentity: GenderIdentitySchema.optional(),
    // Trimmed; an empty string clears it (stored as null). No control
    // characters — it is rendered in greetings.
    firstName: z
      .string()
      .trim()
      .max(PREFERRED_NAME_MAX_LENGTH)
      .regex(/^[^\p{Cc}]*$/u, 'Name contains invalid characters.')
      .nullable()
      .optional(),
    avatarKey: z.string().nullable().optional(),
    profileSetupComplete: z.literal(true).optional(),
    chatBackground: ChatBackgroundSchema.optional(),
    chatBackgroundKey: z.string().nullable().optional(),
  })
  .refine(
    (v) =>
      v.preferredLanguage !== undefined ||
      v.genderIdentity !== undefined ||
      v.firstName !== undefined ||
      v.avatarKey !== undefined ||
      v.profileSetupComplete !== undefined ||
      v.chatBackground !== undefined ||
      v.chatBackgroundKey !== undefined,
    {
      message:
        'At least one of preferredLanguage, genderIdentity, firstName, avatarKey, profileSetupComplete, chatBackground, or chatBackgroundKey is required.',
    }
  )
export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>

/**
 * Shared by both the PUT (write) and GET (read) `/v1/user/preferences`
 * handlers. `avatarUrl` is a short-lived presigned S3 GET URL (`null` when
 * no photo is set) — generated fresh per read, never stored anywhere.
 * `profileSetupCompletedAt` is `null` until the post-signin profile-setup
 * screen has been completed or skipped once. `chatBackgroundUrl` is the same
 * presigned-per-read convention as `avatarUrl`, but only meaningful when
 * `chatBackground === 'custom'` — `null` otherwise (the two curated presets
 * are static public assets the client already has, not S3 objects), and
 * also `null` for `custom` if no `chatBackgroundKey` has actually been set
 * yet (selected `custom` but never finished an upload).
 */
export const PreferencesResponseSchema = z.object({
  preferredLanguage: z.enum(['en', 'he']),
  genderIdentity: GenderIdentitySchema,
  firstName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  profileSetupCompletedAt: z.string().nullable(),
  chatBackground: ChatBackgroundSchema,
  chatBackgroundUrl: z.string().nullable(),
  // Vision generations left this calendar month (UTC) — see VISION_MONTHLY_LIMIT.
  visionRemainingThisMonth: z.number().int().nonnegative(),
})
export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>

/**
 * POST /v1/user/avatar/upload-url — issues a short-lived presigned S3 PUT
 * URL for a direct browser-to-S3 upload (never proxies image bytes through
 * a Lambda). The caller must PUT the raw image bytes to `uploadUrl` with a
 * `Content-Type` header matching what it requested, then send `key` back
 * via `PUT /v1/user/preferences`'s `avatarKey` to actually attach it to the
 * profile — issuing this URL does not itself change anything.
 */
export const AvatarUploadUrlRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})
export type AvatarUploadUrlRequest = z.infer<typeof AvatarUploadUrlRequestSchema>

export const AvatarUploadUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  key: z.string(),
})
export type AvatarUploadUrlResponse = z.infer<typeof AvatarUploadUrlResponseSchema>

/**
 * POST /v1/user/chat-background/upload-url — Main Chat UX Update Slice A's
 * previously-deferred `custom` background (docs/MAIN_CHAT_UX_UPDATE_PLAN.md
 * §3.1). Same presigned-PUT shape as `AvatarUploadUrlRequest/Response`
 * above — deliberately a separate pair of schemas rather than reusing the
 * avatar ones, matching this codebase's existing convention of one schema
 * per endpoint even when the shape is identical. Reuses the same private
 * `AvatarsBucket` (`data-stack.ts`) under a `chat-backgrounds/` key prefix,
 * not a new bucket — same trust model (per-user key namespacing, direct
 * browser-to-S3 PUT, presigned-GET-per-read), no new CORS/lifecycle config
 * needed. The caller must PUT the bytes to `uploadUrl`, then send `key`
 * back via `PUT /v1/user/preferences`'s `chatBackgroundKey` (alongside
 * `chatBackground: 'custom'`) to actually attach it.
 */
export const ChatBackgroundUploadUrlRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})
export type ChatBackgroundUploadUrlRequest = z.infer<typeof ChatBackgroundUploadUrlRequestSchema>

export const ChatBackgroundUploadUrlResponseSchema = z.object({
  uploadUrl: z.string(),
  key: z.string(),
})
export type ChatBackgroundUploadUrlResponse = z.infer<typeof ChatBackgroundUploadUrlResponseSchema>

/** Free Vision generations per user per calendar month (UTC) — the user's product decision (Session 67). */
export const VISION_MONTHLY_LIMIT = 3

/**
 * POST /v1/user/chat-background/vision — starts generating a chat
 * background that places the caller's own profile photo inside a scene they
 * describe (their goal state, or anything they like). Async: returns a
 * `jobId` to poll via GET /v1/user/chat-background/vision/{jobId}, since the
 * image pipeline takes longer than API Gateway's 30s limit.
 */
export const VisionStartRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(400),
})
export type VisionStartRequest = z.infer<typeof VisionStartRequestSchema>

export const VisionStartResponseSchema = z.object({
  jobId: z.string(),
  remainingThisMonth: z.number().int().nonnegative(),
})
export type VisionStartResponse = z.infer<typeof VisionStartResponseSchema>

export const VisionStatusResponseSchema = z.object({
  status: z.enum(['pending', 'done', 'failed']),
  // Set when status is 'failed': 'content_filtered' | 'generation_failed'
  errorCode: z.string().nullable(),
  // Set when status is 'done' — presigned, same as chatBackgroundUrl.
  imageUrl: z.string().nullable(),
})
export type VisionStatusResponse = z.infer<typeof VisionStatusResponseSchema>
