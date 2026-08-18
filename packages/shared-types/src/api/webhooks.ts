import { z } from 'zod'

/**
 * POST /v1/webhooks/payment — generalizes apps/web/src/app/api/webhooks/grow/route.ts
 * onto the /v1 surface (MVP_ARCHITECTURE.md §4). Grow stays the payment
 * provider (ADR 0003), so this mirrors Grow's event shape as the existing
 * handler already assumes it — not a speculative multi-provider abstraction.
 *
 * NOTE: field names here are unconfirmed against Grow's real webhook docs —
 * apps/web/src/lib/grow.ts carries the same caveat ("Confirm exact endpoint
 * paths and field names with Grow's developer docs before going live").
 * Revisit once that's verified. And regardless of how well-typed this
 * payload is, `verifyGrowSignature()` is still a stub that accepts any
 * signature (ADR 0003 pre-launch blocker) — do not wire this endpoint up to
 * anything that grants real credits/entitlements until that's fixed and it
 * has been through a security-review pass.
 */
export const GrowWebhookEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['payment.success', 'subscription.renewed']),
    data: z.object({ plan_id: z.string(), customer_id: z.string() }),
  }),
  z.object({
    type: z.literal('payment.failed'),
    data: z.object({ customer_id: z.string() }),
  }),
  z.object({
    type: z.literal('subscription.cancelled'),
    data: z.object({ customer_id: z.string(), period_end: z.string().datetime() }),
  }),
])
export type GrowWebhookEvent = z.infer<typeof GrowWebhookEventSchema>

export const PaymentWebhookResponseSchema = z.object({
  received: z.literal(true),
})
export type PaymentWebhookResponse = z.infer<typeof PaymentWebhookResponseSchema>
