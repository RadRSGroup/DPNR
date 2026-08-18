import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/**
 * First-pass Mirror Room schema. The MVP spec gives a prompt-logic outline
 * and a data-captured list (situation, trigger, thought, emotion, body
 * response, automatic reaction, coping/protective response, recurring
 * pattern, energy/mood effect, life domain) but not a formal step machine
 * the way Decision Room has one — refine this once Slice 2 (Mirror Room)
 * is actually being built, per MVP_ARCHITECTURE.md §5.2 (same flow-engine
 * as Decision Room, different prompt set and step map).
 */
export const MirrorSessionStatusSchema = z.enum(['active', 'completed'])
export type MirrorSessionStatus = z.infer<typeof MirrorSessionStatusSchema>

export const MirrorSessionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.mirrorRoom(mirrorId)
  mirrorId: z.string(),
  status: MirrorSessionStatusSchema,
  currentStepId: z.string().optional(),
  content: EncryptedBlobSchema, // wraps { situation, trigger, thought, emotion, bodyResponse, automaticReaction, copingResponse, recurringPattern, energyMoodEffect, lifeDomain }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type MirrorSessionItem = z.infer<typeof MirrorSessionItemSchema>
