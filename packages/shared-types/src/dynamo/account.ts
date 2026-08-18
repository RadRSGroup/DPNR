import { z } from 'zod'

export const TierSchema = z.enum(['free', 'core', 'pro'])
export type Tier = z.infer<typeof TierSchema>

/** USER#<id> / PROFILE — app-level profile, not the Cognito record itself. */
export const UserProfileItemSchema = z.object({
  pk: z.string(),
  sk: z.literal('PROFILE'),
  userId: z.string(),
  tier: TierSchema.default('free'),
  consentedAt: z.string().datetime().nullable(),
  consentVersion: z.string().nullable(),
  preferredLanguage: z.enum(['en', 'he']).default('en'),
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
  wrappedPrivateKey: z.string(), // base64, private key wrapped by the KEK
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
  type: z.enum(['grant_trial', 'grant_purchase', 'consume', 'refund']),
  amount: z.number().int(), // positive for grants/refunds, negative for consumption
  balanceAfter: z.number().int().min(0),
  reason: z.string(), // e.g. "decision_room.step_call", "beta_trial_signup", "plan:core_monthly"
  relatedPlanId: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type CreditsTransactionItem = z.infer<typeof CreditsTransactionItemSchema>
