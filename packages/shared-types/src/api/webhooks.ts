import { z } from 'zod'

/**
 * POST /v1/webhooks/payment — Grow's real server-to-server callback shape
 * (corrected Session 18, see ADR 0008; supersedes the earlier fictional
 * `payment.success`/`subscription.renewed`-style event union, which was
 * written before anyone had read Grow's actual docs).
 *
 * Grow has NO signature/HMAC on this callback at all (confirmed via their
 * public docs — see ADR 0008). `cField1`/`cField2` are the two opaque
 * custom fields `credits/initiate-purchase.ts` sets at checkout-link
 * creation time (`purchaseId`, `userId`) and Grow echoes back verbatim —
 * this is the actual authenticity check (does a matching, still-`pending`
 * `PendingPurchaseItem` exist), not this schema.
 *
 * `data.status`/`data.statusCode`'s exact success value, and whether this
 * body arrives as JSON or form-encoded, are both UNCONFIRMED against a real
 * sandbox transaction (no credentials existed this session) — `z.string()`
 * throughout rather than a narrower enum, so a real payload doesn't fail
 * Zod validation before the handler's own explicit status check can even
 * run and reveal what the real value is.
 */
export const GrowWebhookPayloadSchema = z.object({
  err: z.string().optional(),
  status: z.string().optional(),
  data: z.object({
    status: z.string().optional(),
    statusCode: z.string().optional(),
    transactionId: z.string(),
    transactionToken: z.string(),
    sum: z.string(),
    paymentDate: z.string().optional(),
    fullName: z.string().optional(),
    payerEmail: z.string().optional(),
    payerPhone: z.string().optional(),
    asmachta: z.string().optional(),
    cField1: z.string().optional(), // purchaseId
    cField2: z.string().optional(), // userId
  }),
})
export type GrowWebhookPayload = z.infer<typeof GrowWebhookPayloadSchema>

export const PaymentWebhookResponseSchema = z.object({
  received: z.literal(true),
})
export type PaymentWebhookResponse = z.infer<typeof PaymentWebhookResponseSchema>
