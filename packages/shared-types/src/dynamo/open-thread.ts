import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'
import { LifeDomainCategorySchema } from './twin'

/**
 * Intelligence Spec §17 "Open Threads — Continuity Without Turning Everything
 * Into a Goal." A thread the person mentioned that Companion should be able
 * to return to "only when relevant" — explicitly NOT a reminder: nothing
 * here triggers a notification or a repeated prompt just because a thread
 * stays unresolved (see `docs/AGENT_LOG.md`'s Living System Behaviors entry
 * for the extraction mechanism — embedded in the existing Companion
 * `respond`/`onboard` forced tool-use output, not a separate model call).
 *
 * `userOwned` mirrors the same trust-tier distinction `TwinSignalItem`'s
 * onboarding-signal exception already makes: `true` when the person stated
 * the thread's substance directly, `false` when Companion inferred it.
 */
export const OpenThreadStatusSchema = z.enum([
  'active',
  'waiting_for_life',
  'ready_to_review',
  'paused',
  'closed',
])
export type OpenThreadStatus = z.infer<typeof OpenThreadStatusSchema>

export const OpenThreadItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.openThread(threadId)
  threadId: z.string(),
  status: OpenThreadStatusSchema,
  content: EncryptedBlobSchema, // wraps { subject: string, whyItMatters: string }
  lifeDomain: LifeDomainCategorySchema.optional(),
  sourceSessionId: z.string().optional(),
  lastTouchedAt: z.string().datetime(),
  optionalReviewAt: z.string().datetime().optional(),
  userOwned: z.boolean(),
  relatedGoalId: z.string().optional(),
  relatedSignalIds: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
})
export type OpenThreadItem = z.infer<typeof OpenThreadItemSchema>
