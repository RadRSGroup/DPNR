import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/** Generic session envelope — any room or Companion chat. Metadata plaintext (MVP_ARCHITECTURE.md §3.1). */
export const RoomTypeSchema = z.enum(['companion', 'decision', 'mirror'])
export type RoomType = z.infer<typeof RoomTypeSchema>

export const SessionStatusSchema = z.enum(['active', 'completed', 'abandoned'])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export const SessionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.session(sessionId)
  sessionId: z.string(),
  roomType: RoomTypeSchema,
  status: SessionStatusSchema,
  currentStepId: z.string().optional(), // symbolic step id, not a UI number (migration plan §11 command contract)
  sessionVersion: z.number().int().min(0), // for optimistic concurrency (expectedSessionVersion)
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
})
export type SessionItem = z.infer<typeof SessionItemSchema>

/** Companion chat turn — the most privacy-sensitive stream in the product. Fully encrypted, no exceptions. */
export const SessionMessageItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.sessionMessage(sessionId, isoTimestamp)
  role: z.enum(['user', 'assistant']),
  content: EncryptedBlobSchema, // wraps { text: string }
  createdAt: z.string().datetime(),
})
export type SessionMessageItem = z.infer<typeof SessionMessageItemSchema>

export const SessionSummaryItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.sessionSummary(sessionId)
  content: EncryptedBlobSchema, // wraps { summary: string, candidateSignalIds: string[] }
  promptRef: z.string(), // e.g. "companion/session_summary@v3" — structural, stays plaintext (§8.3)
  createdAt: z.string().datetime(),
})
export type SessionSummaryItem = z.infer<typeof SessionSummaryItemSchema>
