import { z } from 'zod'
import { TwinSignalDomainSchema, TwinSignalStatusSchema, LifeDomainCategorySchema, ArchetypeSchema } from '../dynamo/twin'

/**
 * Aggregate read for GET /v1/dashboard (MVP_ARCHITECTURE.md §4) — one call,
 * decrypted server-side during the session via the ticket, composed for
 * the "system hub / data room" surface. Only a handful of the fields the
 * Dashboard contract (MVP spec) actually needs are modeled here; extend
 * as Slice 1 UI work reveals more precisely what it reads.
 */
export const DashboardResponseSchema = z.object({
  roadmap: z
    .object({
      currentFocus: z.string(),
      theme: z.string(),
      direction: z.string(),
      suggestedSpaces: z.array(z.string()),
    })
    .nullable(), // null until onboarding has produced one
  // A pending revision (Session 16) — present only when roadmap/revise has
  // decided the accumulated confirmed evidence warrants one. Never applied
  // automatically; the person must accept it via
  // POST /v1/roadmap/proposal/accept (spec §5 Trust rules, extended to the
  // Roadmap itself at the user's direct instruction).
  roadmapProposal: z
    .object({
      currentFocus: z.string(),
      theme: z.string(),
      direction: z.string(),
      suggestedSpaces: z.array(z.string()),
      rationale: z.string(),
    })
    .nullable(),
  continuityCue: z
    .object({
      kind: z.enum(['daily_card', 'continuation', 'commitment', 'roadmap_cue', 'recommended_space']),
      text: z.string(),
      actionRoomType: z.enum(['decision', 'mirror', 'library']).optional(),
      actionRoomId: z.string().optional(),
    })
    .nullable(),
  creditsBalance: z.number().int().min(0),
  creditsLow: z.boolean(),
  // Alignment Score v1: how well the person is living out what they've told
  // DPNR matters to them. 60% commitment follow-through rate (completed vs
  // dropped, among CommitmentItems that have actually been resolved) + 40%
  // values clarity (how many domain='value' Twin signals are confirmed,
  // capped at 5 confirmed = 100%). Null until there's enough real data to
  // say anything (no resolved commitments AND no confirmed values) — an
  // honest gap, not a fabricated number. Weights/cap are a first pass
  // (Session 19), not product-reviewed; revisit once real usage data exists.
  alignmentScore: z.number().min(0).max(100).nullable(),
  // Real daily snapshots (AlignmentScoreSnapshotItem), last 30 days,
  // ascending by date. Empty until snapshot-alignment-score.ts has run at
  // least once for this user — sparse-by-design, not padded with fabricated
  // history.
  alignmentHistory: z.array(z.object({ date: z.string(), score: z.number() })),
  // Real aggregates over confirmed signals that have been classified (Session
  // 19, twin/classify_signal) — only entries for categories with at least
  // one classified signal; empty arrays until the person has any. Percent
  // is share of classified-and-confirmed signals in that category, rounded.
  lifeDomains: z.array(z.object({ domain: LifeDomainCategorySchema, percent: z.number() })),
  archetypes: z.array(z.object({ archetype: ArchetypeSchema, percent: z.number() })),
  // Growth Tracker (Slice 4): real counts of confirmed Twin signals created
  // in the current calendar month (UTC) — not all-time totals. Computed
  // from the same twinSignals query this handler already makes for
  // lifeDomains/archetypes, no new DB read. insightsGained counts every
  // confirmed signal regardless of domain; patternsShifting is the
  // domain='pattern' subset of that same window.
  insightsGained: z.number().int().min(0),
  patternsShifting: z.number().int().min(0),
})
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>

/** GET /v1/twin */
export const TwinListResponseSchema = z.object({
  signals: z.array(
    z.object({
      signalId: z.string(),
      domain: TwinSignalDomainSchema,
      status: TwinSignalStatusSchema,
      confidence: z.number().min(0).max(1),
      description: z.string(), // decrypted server-side for this response, per §6.6 "Interactive AI call" flow
      // Set at confirm-time by twin/classify_signal (Session 19) — absent
      // for signals confirmed before that existed, or if classification
      // failed. Exposed here (My Evolution Map, Slice 5) so a real per-domain
      // "Focus Areas" drill-down can filter the caller's own already-fetched
      // signal list instead of re-deriving classification client-side or
      // duplicating Dashboard's aggregate logic for one filtered view.
      lifeDomain: LifeDomainCategorySchema.optional(),
      archetype: ArchetypeSchema.optional(),
    })
  ),
})
export type TwinListResponse = z.infer<typeof TwinListResponseSchema>

/** POST /v1/twin/signals/{id}/confirm | reject — spec §5 Trust rules: never silently overwritten. */
export const TwinSignalActionResponseSchema = z.object({
  signalId: z.string(),
  status: TwinSignalStatusSchema,
})
export type TwinSignalActionResponse = z.infer<typeof TwinSignalActionResponseSchema>

/** POST /v1/roadmap/proposal/accept — the proposed content becomes the live Roadmap. */
export const RoadmapProposalAcceptResponseSchema = z.object({
  currentFocus: z.string(),
  theme: z.string(),
  direction: z.string(),
  suggestedSpaces: z.array(z.string()),
})
export type RoadmapProposalAcceptResponse = z.infer<typeof RoadmapProposalAcceptResponseSchema>

/** POST /v1/roadmap/proposal/reject — the proposal is discarded; the live Roadmap is untouched. */
export const RoadmapProposalRejectResponseSchema = z.object({ ok: z.literal(true) })
export type RoadmapProposalRejectResponse = z.infer<typeof RoadmapProposalRejectResponseSchema>

/** GET /v1/credits */
export const CreditsResponseSchema = z.object({
  balance: z.number().int().min(0),
  lowBalanceThreshold: z.number().int().min(0),
  isLow: z.boolean(),
  isExhausted: z.boolean(),
})
export type CreditsResponse = z.infer<typeof CreditsResponseSchema>

/**
 * POST /v1/credits/purchase — initiates a Grow hosted checkout page, it does
 * NOT synchronously grant credits (corrected Session 18, see ADR 0008 —
 * Grow's real API is a redirect-to-hosted-page flow, not a client-side
 * tokenized charge; the real balance change only happens later via the
 * `/v1/webhooks/payment` callback once Grow confirms payment).
 */
export const CreditsPurchaseRequestSchema = z.object({
  planId: z.string(),
})
export type CreditsPurchaseRequest = z.infer<typeof CreditsPurchaseRequestSchema>

export const CreditsPurchaseResponseSchema = z.object({
  paymentPageUrl: z.string(),
  purchaseId: z.string(),
})
export type CreditsPurchaseResponse = z.infer<typeof CreditsPurchaseResponseSchema>

/**
 * GET /v1/credits/transactions — the real ledger, most-recent first. Reads
 * back the same CreditsTransactionItem rows grantCredits/consumeCredits
 * already write (dynamo/account.ts) — nothing here is new state, just a
 * missing read.
 */
export const CreditsTransactionViewSchema = z.object({
  type: z.enum(['grant_trial', 'grant_purchase', 'grant_earned', 'consume', 'refund']),
  amount: z.number().int(),
  balanceAfter: z.number().int().min(0),
  reason: z.string(),
  createdAt: z.string().datetime(),
})
export type CreditsTransactionView = z.infer<typeof CreditsTransactionViewSchema>

export const CreditsTransactionsResponseSchema = z.object({
  transactions: z.array(CreditsTransactionViewSchema),
})
export type CreditsTransactionsResponse = z.infer<typeof CreditsTransactionsResponseSchema>

/**
 * GET /v1/plans — catalog read (dynamo/global-tables.ts PlanItem), kept
 * configurable per spec §Beta Trial rather than hard-coded into product
 * logic. Only `active` plans are expected to be returned by the handler;
 * `active` itself isn't part of the client-facing shape.
 */
export const PlanSummarySchema = z.object({
  planId: z.string(),
  displayName: z.string(),
  kind: z.enum(['credit_pack', 'subscription']),
  credits: z.number().int().positive(),
  priceMinorUnits: z.number().int().nonnegative(), // e.g. agorot for ILS
  currency: z.string(),
  billingFrequency: z.enum(['one_time', 'monthly']).optional(),
})
export type PlanSummary = z.infer<typeof PlanSummarySchema>

export const PlansResponseSchema = z.object({
  plans: z.array(PlanSummarySchema),
})
export type PlansResponse = z.infer<typeof PlansResponseSchema>
