import { z } from 'zod'
import { CommitmentStatusSchema, DailyCardFeedbackSchema } from '../dynamo/continuity'
import { LifeDomainCategorySchema } from '../dynamo/twin'

/**
 * Daily Card / Weekly Recap / Commitments (MVP_ARCHITECTURE.md §5.7).
 * Card/Recap reads are pre-computed by the scheduled pipeline (§6) — these
 * endpoints are cache hits, decrypted server-side, not on-demand generation.
 */

/** GET /v1/daily-card */
export const DailyCardResponseSchema = z.object({
  date: z.string().date(),
  kind: z.enum(['thought', 'question', 'reminder', 'micro_practice']),
  text: z.string(),
  dismissedAt: z.string().datetime().nullable(),
  feedback: DailyCardFeedbackSchema.nullable(),
})
export type DailyCardResponse = z.infer<typeof DailyCardResponseSchema>

/** POST /v1/daily-card/feedback — records dismiss and/or relevance feedback on today's card. */
export const DailyCardFeedbackRequestSchema = z.object({
  dismissed: z.boolean().optional(),
  feedback: DailyCardFeedbackSchema.optional(),
})
export type DailyCardFeedbackRequest = z.infer<typeof DailyCardFeedbackRequestSchema>
export const DailyCardFeedbackResponseSchema = z.object({ ok: z.literal(true) })
export type DailyCardFeedbackResponse = z.infer<typeof DailyCardFeedbackResponseSchema>

/** GET /v1/weekly-recap */
export const WeeklyRecapResponseSchema = z.object({
  week: z.string(), // ISO week, e.g. "2026-W33"
  stoodOut: z.string(),
  shifted: z.string(),
  remainsActive: z.string(),
  suggestion: z.string(),
})
export type WeeklyRecapResponse = z.infer<typeof WeeklyRecapResponseSchema>

/** POST /v1/commitments */
export const CreateCommitmentRequestSchema = z.object({
  description: z.string().min(1),
  reviewDate: z.string().date().nullable(), // null means "ongoing" — no target date
  lifeDomain: LifeDomainCategorySchema.optional(),
  sourceRoomType: z.enum(['decision', 'mirror']).optional(),
  sourceSessionId: z.string().optional(),
})
export type CreateCommitmentRequest = z.infer<typeof CreateCommitmentRequestSchema>

export const CommitmentViewSchema = z.object({
  commitmentId: z.string(),
  status: CommitmentStatusSchema,
  description: z.string(),
  reviewDate: z.string().date().nullable(),
  lifeDomain: LifeDomainCategorySchema.optional(),
  sourceRoomType: z.enum(['decision', 'mirror']).optional(),
  createdAt: z.string().datetime(),
})
export type CommitmentView = z.infer<typeof CommitmentViewSchema>

/** GET /v1/commitments */
export const CommitmentsResponseSchema = z.object({
  commitments: z.array(CommitmentViewSchema),
})
export type CommitmentsResponse = z.infer<typeof CommitmentsResponseSchema>

/** POST /v1/commitments response — the created commitment, same shape as a list item. */
export const CreateCommitmentResponseSchema = CommitmentViewSchema
export type CreateCommitmentResponse = z.infer<typeof CreateCommitmentResponseSchema>
