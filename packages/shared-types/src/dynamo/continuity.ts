import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'
import { LifeDomainCategorySchema } from './twin'

export const CommitmentStatusSchema = z.enum(['open', 'completed', 'dropped'])
export type CommitmentStatus = z.infer<typeof CommitmentStatusSchema>

export const CommitmentItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.commitment(commitmentId)
  commitmentId: z.string(),
  status: CommitmentStatusSchema,
  reviewDate: z.string().date().nullable(), // null also means "ongoing" — no target date, not "unset"
  // Optional life-domain tag (added for My Evolution Map's "Goals & Dreams"
  // widget) — a commitment created before this existed, or one not tied to
  // a specific domain, simply has none. Reuses the same 7-category taxonomy
  // Life Domains/Leading Archetypes already use, no new taxonomy invented.
  lifeDomain: LifeDomainCategorySchema.optional(),
  sourceRoomType: z.enum(['decision', 'mirror']).optional(),
  sourceSessionId: z.string().optional(),
  content: EncryptedBlobSchema, // wraps { description: string }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type CommitmentItem = z.infer<typeof CommitmentItemSchema>

export const InsightItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.insight(insightId)
  content: EncryptedBlobSchema, // wraps { text: string }
  promptRef: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type InsightItem = z.infer<typeof InsightItemSchema>

export const DailyCardFeedbackSchema = z.enum(['relevant', 'not_relevant'])
export type DailyCardFeedback = z.infer<typeof DailyCardFeedbackSchema>

export const DailyCardItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.dailyCard(isoDate)
  content: EncryptedBlobSchema, // wraps { text: string, kind: 'thought'|'question'|'reminder'|'micro_practice' }
  promptRef: z.string(),
  createdAt: z.string().datetime(),
  // Data captured per spec §4 Daily Card contract ("Open/dismiss/save response;
  // explicit relevance feedback if provided") — plain structural fields, not
  // personal content, so unencrypted like every other non-content field here.
  dismissedAt: z.string().datetime().nullable().optional(),
  feedback: DailyCardFeedbackSchema.nullable().optional(),
})
export type DailyCardItem = z.infer<typeof DailyCardItemSchema>

export const WeeklyRecapItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.weeklyRecap(isoWeek)
  content: EncryptedBlobSchema, // wraps { stoodOut, shifted, remainsActive, suggestion }
  promptRef: z.string(),
  createdAt: z.string().datetime(),
})
export type WeeklyRecapItem = z.infer<typeof WeeklyRecapItemSchema>
