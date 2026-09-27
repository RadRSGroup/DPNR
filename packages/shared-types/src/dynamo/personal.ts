import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/**
 * My Profile personal space (Session 74, Wave 2 Slice 5 / founder feedback
 * #16, user-approved 2026-09-27): the person's own rituals and a private
 * journal. Both are the person's own words, so the text lives only inside
 * the encrypted `content` blob (export decrypts `content`; account deletion
 * removes the whole partition). Neither is read by any AI, the Digital
 * Twin, signals or scoring. No reminders (not built: there is no
 * scheduling/notification infrastructure — flagged, not invented).
 */
export const RitualTimeOfDaySchema = z.enum(['morning', 'afternoon', 'evening'])
export type RitualTimeOfDay = z.infer<typeof RitualTimeOfDaySchema>

export const RitualItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.ritual(ritualId)
  ritualId: z.string(),
  // Plain: a time-of-day bucket, not personal content; lets the profile show
  // per-bucket counts. The ritual's text is encrypted.
  timeOfDay: RitualTimeOfDaySchema,
  content: EncryptedBlobSchema, // wraps { text }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type RitualItem = z.infer<typeof RitualItemSchema>

export const JournalEntryItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.journalEntry(entryId) — entryId sorts by creation time
  entryId: z.string(),
  content: EncryptedBlobSchema, // wraps { title?, body }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type JournalEntryItem = z.infer<typeof JournalEntryItemSchema>
