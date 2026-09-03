import { z } from 'zod'
import { OpenThreadStatusSchema } from '../dynamo/open-thread'
import { LifeDomainCategorySchema } from '../dynamo/twin'

/**
 * GET /v1/open-threads — non-closed threads (Intelligence Spec §17), most
 * recently touched first. Creation is model-driven only (embedded in
 * Companion's own `respond`/`onboard` output, see
 * infra/cdk/lambda/companion/message.ts) — there is deliberately no
 * POST /v1/open-threads to create one by hand in this pass.
 */
export const OpenThreadViewSchema = z.object({
  threadId: z.string(),
  status: OpenThreadStatusSchema,
  subject: z.string(), // decrypted server-side for this response
  whyItMatters: z.string(),
  lifeDomain: LifeDomainCategorySchema.optional(),
  lastTouchedAt: z.string().datetime(),
  userOwned: z.boolean(),
})
export type OpenThreadView = z.infer<typeof OpenThreadViewSchema>

export const OpenThreadsResponseSchema = z.object({
  threads: z.array(OpenThreadViewSchema),
})
export type OpenThreadsResponse = z.infer<typeof OpenThreadsResponseSchema>

/** POST /v1/open-threads/{id}/close | pause — the user's own explicit action; "closed"/"paused" are terminal-ish, not silently reopened. */
export const OpenThreadActionResponseSchema = z.object({
  threadId: z.string(),
  status: OpenThreadStatusSchema,
})
export type OpenThreadActionResponse = z.infer<typeof OpenThreadActionResponseSchema>
