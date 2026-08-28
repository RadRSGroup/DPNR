import { z } from 'zod'

/**
 * Cost per billable action — the user's own confirmed decision (Session 18).
 * Lives here (not just in `infra/cdk/lambda/lib/credits.ts`) so the frontend
 * can show the real charge (e.g. Mirror Room's "1 credit" badge) without a
 * second, driftable copy of the number.
 */
export const ROOM_REFINE_COST = 1
export const COMPANION_MESSAGE_COST = 1

/**
 * One-time credit rewards for the two non-gamified "Earn More Credits" tiles
 * (Slice 6, My Wallet — `docs/AGENT_LOG.md`). Amounts are this session's own
 * first-draft choice, not sourced from a product decision — flag for review
 * the same way Slice 3's domain→taxonomy mapping was. Deliberately excludes
 * "Daily Check-in"/"Practice Streak" (streak-shaped, dropped per the
 * project's gamification decision), so only these two exist.
 */
export const EARN_COMMITMENT_COMPLETED_CREDITS = 2
export const EARN_REFLECTION_COMPLETED_CREDITS = 1

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
  type: z.enum(['grant_trial', 'grant_purchase', 'grant_earned', 'consume', 'refund']),
  amount: z.number().int(), // positive for grants/refunds, negative for consumption
  balanceAfter: z.number().int().min(0),
  reason: z.string(), // e.g. "decision_room.step_call", "beta_trial_signup", "plan:core_monthly"
  relatedPlanId: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type CreditsTransactionItem = z.infer<typeof CreditsTransactionItemSchema>

/**
 * USER#<id> / PURCHASE#<purchaseId> — correlates a Grow checkout-link
 * initiation with its later webhook (ADR 0008, Session 18). `purchaseId`
 * (a `cField1` custom field Grow echoes back verbatim) only proves the
 * webhook is talking about a purchase this backend actually initiated — it
 * does NOT prove the payment really happened, since Grow's real API has no
 * signature and its only other documented endpoint (`approveTransaction`)
 * explicitly doesn't gate anything either. A real user could otherwise
 * forge a "success" webhook for their own genuine `pending` purchase and
 * grant themselves free credits.
 *
 * **Safety valve (Session 18, pending a real Grow verification endpoint)**:
 * `credits/grow-webhook.ts` never calls `grantCredits` itself. A payload
 * that passes its checks (correlation + sum match + claimed success) moves
 * the item to `awaiting_review`, storing the claimed transaction fields for
 * a human to cross-check against Grow's own merchant dashboard (which a
 * forger cannot fake) before `infra/cdk/scripts/approve-pending-purchase.ts`
 * is run to actually grant the credits and mark `completed`. Revisit this
 * the moment Grow support confirms a real transaction-status-verification
 * call exists — see ADR 0008.
 */
export const PendingPurchaseItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.pendingPurchase(purchaseId)
  purchaseId: z.string(),
  planId: z.string(),
  status: z.enum(['pending', 'awaiting_review', 'completed', 'failed']),
  expectedCredits: z.number().int().positive(),
  expectedPriceMinorUnits: z.number().int().nonnegative(),
  // Grow's own claimed transaction fields, stored unverified for manual
  // cross-checking — never trusted as proof of payment on their own.
  claimedTransactionId: z.string().optional(),
  claimedTransactionToken: z.string().optional(),
  createdAt: z.string().datetime(),
  reviewedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
})
export type PendingPurchaseItem = z.infer<typeof PendingPurchaseItemSchema>
