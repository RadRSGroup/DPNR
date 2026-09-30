import { z } from 'zod'
import { RITUAL_TEXT_MAX, JOURNAL_TITLE_MAX, JOURNAL_BODY_MAX } from '../constants'
import { RitualTimeOfDaySchema } from '../dynamo/personal'


/** GET /v1/rituals, POST /v1/rituals, PUT/DELETE /v1/rituals/{id}. */
export const RitualViewSchema = z.object({
  ritualId: z.string(),
  timeOfDay: RitualTimeOfDaySchema,
  text: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type RitualView = z.infer<typeof RitualViewSchema>

export const RitualsListResponseSchema = z.object({ rituals: z.array(RitualViewSchema) })
export type RitualsListResponse = z.infer<typeof RitualsListResponseSchema>

export const CreateRitualRequestSchema = z.object({
  timeOfDay: RitualTimeOfDaySchema,
  text: z.string().trim().min(1).max(RITUAL_TEXT_MAX),
})
export type CreateRitualRequest = z.infer<typeof CreateRitualRequestSchema>

export const UpdateRitualRequestSchema = z
  .object({
    timeOfDay: RitualTimeOfDaySchema.optional(),
    text: z.string().trim().min(1).max(RITUAL_TEXT_MAX).optional(),
  })
  .refine((v) => v.timeOfDay !== undefined || v.text !== undefined, { message: 'Nothing to update.' })
export type UpdateRitualRequest = z.infer<typeof UpdateRitualRequestSchema>

/** GET /v1/journal?cursor=, POST /v1/journal, PUT/DELETE /v1/journal/{id}. Newest first. */
export const JournalEntryViewSchema = z.object({
  entryId: z.string(),
  title: z.string().optional(),
  body: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type JournalEntryView = z.infer<typeof JournalEntryViewSchema>

export const JournalListResponseSchema = z.object({
  entries: z.array(JournalEntryViewSchema),
  /** Opaque; pass back as `cursor` for the next (older) page. Absent on the last page. */
  nextCursor: z.string().optional(),
})
export type JournalListResponse = z.infer<typeof JournalListResponseSchema>

export const CreateJournalEntryRequestSchema = z.object({
  title: z.string().trim().max(JOURNAL_TITLE_MAX).optional(),
  body: z.string().trim().min(1).max(JOURNAL_BODY_MAX),
})
export type CreateJournalEntryRequest = z.infer<typeof CreateJournalEntryRequestSchema>

export const UpdateJournalEntryRequestSchema = CreateJournalEntryRequestSchema
export type UpdateJournalEntryRequest = z.infer<typeof UpdateJournalEntryRequestSchema>
