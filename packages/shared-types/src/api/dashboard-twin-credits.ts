import { z } from 'zod'
import { TwinSignalDomainSchema, TwinSignalStatusSchema } from '../dynamo/twin'

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

/** GET /v1/credits */
export const CreditsResponseSchema = z.object({
  balance: z.number().int().min(0),
  lowBalanceThreshold: z.number().int().min(0),
  isLow: z.boolean(),
  isExhausted: z.boolean(),
})
export type CreditsResponse = z.infer<typeof CreditsResponseSchema>

/** POST /v1/credits/purchase — provider references only, never card data (spec §8 launch blocker). */
export const CreditsPurchaseRequestSchema = z.object({
  planId: z.string(),
  paymentProviderToken: z.string(), // opaque token/reference from Grow, never raw payment details
})
export type CreditsPurchaseRequest = z.infer<typeof CreditsPurchaseRequestSchema>

export const CreditsPurchaseResponseSchema = z.object({
  balance: z.number().int().min(0),
  transactionId: z.string(),
})
export type CreditsPurchaseResponse = z.infer<typeof CreditsPurchaseResponseSchema>
