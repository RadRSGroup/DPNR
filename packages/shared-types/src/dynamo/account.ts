import { z } from 'zod'

export const TierSchema = z.enum(['free', 'core', 'pro'])
export type Tier = z.infer<typeof TierSchema>

/**
 * Collected via the dedicated post-signin profile-setup screen (moved out
 * of the signup form itself in Session 51 — see `UserProfileItemSchema`'s
 * `profileSetupCompletedAt`) purely to pick correct Hebrew grammatical
 * gender in AI-generated responses (second-person verb conjugation) —
 * never used for anything else, and irrelevant when `preferredLanguage` is
 * `'en'`. `unspecified` is the default; Slice E's `toLanguageInstruction()`
 * (`infra/cdk/lambda/lib/locale.ts`) falls back to masculine grammatical
 * forms for it, per the user's own settled decision (Session 50).
 */
export const GenderIdentitySchema = z.enum(['male', 'female', 'unspecified'])
export type GenderIdentity = z.infer<typeof GenderIdentitySchema>

/**
 * Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1) — two curated
 * presets, both real finished designs per the reference mockups
 * (docs/reference-screens/chat/CHAT UX.png / CHAT UX 2.png), not a "pick one, defer the other"
 * choice. `digital_twin` (the cosmic character, continuing this app's
 * existing InnerSelf/Digital Twin branding) is the default for new users,
 * matching the PDF's own stated reasoning for that option. `custom` means
 * "use `chatBackgroundKey`" — a user's own uploaded photo, via
 * `POST /v1/user/chat-background/upload-url`, same `chat-backgrounds/`
 * prefix under the existing private `AvatarsBucket`. Selecting `custom`
 * with no key set (upload started but never finished) falls back to the
 * default preset, same tolerance `avatarKey: null` already gets.
 */
export const ChatBackgroundSchema = z.enum(['digital_twin', 'environment', 'custom'])
export type ChatBackground = z.infer<typeof ChatBackgroundSchema>

/**
 * USER#<id> / VISION#JOB#<jobId> — status of one async chat-background
 * "Vision" generation (`account/vision-start.ts` creates it, the worker
 * `account/vision-worker.ts` finishes it, `account/vision-status.ts` reads
 * it). Deliberately holds NO user text: the scene description only ever
 * travels in the worker's invocation payload, never persisted (standing
 * no-plaintext-personal-content rule). `ttl` lets DynamoDB expire old jobs.
 */
export const VisionJobStatusSchema = z.enum(['pending', 'done', 'failed'])
export type VisionJobStatus = z.infer<typeof VisionJobStatusSchema>
export const VisionJobItemSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  jobId: z.string(),
  status: VisionJobStatusSchema,
  quotaMonth: z.string(), // YYYY-MM the generation was counted against (for refunds)
  resultKey: z.string().optional(),
  errorCode: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  ttl: z.number().int(),
})
export type VisionJobItem = z.infer<typeof VisionJobItemSchema>

/** USER#<id> / VISION#QUOTA#<YYYY-MM> — generations used that month. */
export const VisionQuotaItemSchema = z.object({
  pk: z.string(),
  sk: z.string(),
  count: z.number().int().nonnegative(),
  ttl: z.number().int(),
})
export type VisionQuotaItem = z.infer<typeof VisionQuotaItemSchema>

/** USER#<id> / PROFILE — app-level profile, not the Cognito record itself. */
export const UserProfileItemSchema = z.object({
  pk: z.string(),
  sk: z.literal('PROFILE'),
  userId: z.string(),
  tier: TierSchema.default('free'),
  consentedAt: z.string().datetime().nullable(),
  consentVersion: z.string().nullable(),
  // Session 73 (Wave 2 #1): when the person confirmed they are 18 or older,
  // set by POST /v1/user/consent together with consentedAt. Optional for
  // profiles written before it existed (read as "not confirmed").
  ageConfirmedAt: z.string().datetime().nullable().optional(),
  preferredLanguage: z.enum(['en', 'he']).default('en'),
  genderIdentity: GenderIdentitySchema.default('unspecified'),
  // Session 70 — the name the person wants to be called, asked on the
  // profile-setup screen (editable in Account). Identity data like the
  // email Cognito already holds in plaintext, not session content; shown
  // by the frontend only ("Hi <name>," before the return greeting) and
  // never sent to a model. `null` = not given (UI falls back to the email
  // local part, the pre-Session-70 behavior).
  firstName: z.string().nullable().default(null),
  // S3 object key (never a URL — the bucket is private, a fresh presigned
  // GET is generated per read). `null` = no photo set.
  avatarKey: z.string().nullable().default(null),
  chatBackground: ChatBackgroundSchema.default('digital_twin'),
  // S3 object key for a `custom` background, same private-bucket/presigned-
  // read convention as `avatarKey`. `null` if none has been uploaded.
  chatBackgroundKey: z.string().nullable().default(null),
  // Session 51 — gender moved out of the signup form into a dedicated
  // post-signin profile-setup screen (gender + optional photo), per the
  // user's own request superseding Session 50's "fold into signup"
  // decision. Set once the screen is completed OR explicitly skipped;
  // `null` is what gates `proxy.ts`'s one-time redirect to that screen.
  profileSetupCompletedAt: z.string().datetime().nullable().default(null),
  betaTrialActivatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type UserProfileItem = z.infer<typeof UserProfileItemSchema>

/**
 * USER#<id> / KEYS — crypto material envelope (aws-migration-plan.html §6.1–6.3).
 * Populated by an explicit client-driven API call after signup, NOT by the
 * Cognito post-confirmation trigger — key generation is a client-side
 * operation the server never sees the inputs to.
 */
export const UserKeysItemSchema = z.object({
  pk: z.string(),
  sk: z.literal('KEYS'),
  salt: z.string(), // base64, for Argon2id KEK derivation
  wrappedDek: z.string(), // base64, DEK wrapped by the password/passkey-derived KEK
  wrappedDekRecovery: z.string(), // base64, DEK wrapped a second time by the recovery code
  publicKey: z.string(), // base64 X25519 public key (plaintext — used by ticketless writers)
  wrappedPrivateKey: z.string(), // base64, private key wrapped by the raw DEK itself (not a KEK) — see ADR 0014: this makes it recoverable via either wrappedDek or wrappedDekRecovery, since both unwrap to the same DEK
  createdAt: z.string().datetime(),
})
export type UserKeysItem = z.infer<typeof UserKeysItemSchema>

/** USER#<id> / CREDITS — current balance head. Plaintext: this is billing state, not personal content. */
export const CreditsBalanceItemSchema = z.object({
  pk: z.string(),
  sk: z.literal('CREDITS'),
  balance: z.number().int().min(0),
  lowBalanceThreshold: z.number().int().min(0),
  updatedAt: z.string().datetime(),
})
export type CreditsBalanceItem = z.infer<typeof CreditsBalanceItemSchema>

/** USER#<id> / CREDITS#TXN#<ts> — auditable ledger entry. One item per grant/consume/purchase. */
export const CreditsTransactionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.creditsTxn(isoTimestamp)
  type: z.enum(['grant_trial', 'grant_purchase', 'grant_earned', 'consume', 'refund']),
  amount: z.number().int(), // positive for grants/refunds, negative for consumption
  balanceAfter: z.number().int().min(0),
  reason: z.string(), // e.g. "decision_room.step_call", "beta_trial_signup", "plan:core_monthly"
  relatedPlanId: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type CreditsTransactionItem = z.infer<typeof CreditsTransactionItemSchema>

