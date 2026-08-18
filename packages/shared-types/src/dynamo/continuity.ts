import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

export const CommitmentStatusSchema = z.enum(['open', 'completed', 'dropped'])
export type CommitmentStatus = z.infer<typeof CommitmentStatusSchema>

export const CommitmentItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.commitment(commitmentId)
  commitmentId: z.string(),
  status: CommitmentStatusSchema,
  reviewDate: z.string().date().nullable(),
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

export const DailyCardItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.dailyCard(isoDate)
  content: EncryptedBlobSchema, // wraps { text: string, kind: 'thought'|'question'|'reminder'|'micro_practice' }
  promptRef: z.string(),
  createdAt: z.string().datetime(),
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
