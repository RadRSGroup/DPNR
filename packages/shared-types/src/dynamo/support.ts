import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/** USER#<id> / LIBRARY#PROGRESS#<slug> — non-sensitive per MVP_ARCHITECTURE.md §3.1, stays plaintext. */
export const LibraryProgressItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.libraryProgress(topicSlug)
  topicSlug: z.string(),
  openedAt: z.string().datetime(),
  saved: z.boolean(),
  relevanceFeedback: z.enum(['relevant', 'not_relevant']).optional(),
})
export type LibraryProgressItem = z.infer<typeof LibraryProgressItemSchema>

/** USER#<id> / USAGE#<billing-period> — atomic counter, plaintext (billing). */
export const UsageCounterItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.usage(billingPeriod)
  billingPeriod: z.string(), // e.g. "2026-08"
  creditsUsed: z.number().int().min(0),
  cap: z.number().int().min(0),
  updatedAt: z.string().datetime(),
})
export type UsageCounterItem = z.infer<typeof UsageCounterItemSchema>

/** USER#<id> / PROMPT_OVERLAY#<domain> — per-user personalization overlay (migration plan §8.4). */
export const PromptOverlayItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.promptOverlay(domain)
  domain: z.string(), // e.g. "decision_room", "companion"
  authoredAgainstBaseVersion: z.number().int().min(1),
  content: EncryptedBlobSchema, // wraps { personalization: string }
  updatedAt: z.string().datetime(),
})
export type PromptOverlayItem = z.infer<typeof PromptOverlayItemSchema>
