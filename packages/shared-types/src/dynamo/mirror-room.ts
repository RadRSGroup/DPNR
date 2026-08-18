import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/**
 * Mirror Room schema. Session 5 designed this collaboratively with the
 * user as a first pass (no pre-migration implementation or spec docx was
 * available), then the user gave explicit product review and approved the
 * grouping and both prompts as-is (Session 6) — this is no longer a
 * flagged draft the way it was when first built. The 10 original data
 * fields (situation, trigger, thought, emotion, body response, automatic
 * reaction, coping/protective response, recurring pattern, energy/mood
 * effect, life domain) were already committed before Session 5; an 11th,
 * `commitment`, was added in Session 6 per the product review below.
 */
export const MirrorSessionStatusSchema = z.enum(['active', 'completed'])
export type MirrorSessionStatus = z.infer<typeof MirrorSessionStatusSchema>

export const MirrorSessionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.mirrorRoom(mirrorId)
  mirrorId: z.string(),
  status: MirrorSessionStatusSchema,
  currentStepId: z.string().optional(),
  content: EncryptedBlobSchema, // wraps { situation, trigger, thought, emotion, bodyResponse, automaticReaction, copingResponse, recurringPattern, energyMoodEffect, lifeDomain, commitment }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type MirrorSessionItem = z.infer<typeof MirrorSessionItemSchema>

/**
 * Step grouping of the content fields, product-reviewed and approved in
 * Session 6 — treat this as settled, same status as Decision Room's step
 * map. SITUATION: situation, trigger. AUTOMATIC_REACTION: thought,
 * emotion, bodyResponse, automaticReaction (the in-the-moment cluster —
 * what they thought, felt, sensed in the body, and actually did/said;
 * also one of two AI touchpoints in this flow, mirroring Decision Room's
 * emotion_reflection). PATTERN: copingResponse (how they tried to
 * protect/cope afterward — distinct from `automaticReaction`'s in-the-
 * moment behavior), recurringPattern (widens from this one incident to a
 * recurring pattern — "trigger people/trigger situations" in the
 * architecture doc's phrase). LIFE_IMPACT: energyMoodEffect, lifeDomain
 * ("shape the character"). SYNTHESIS: no new fields — a closing
 * restatement/synthesis prompt (`REFINE`, ephemeral, not persisted).
 * COMMITMENT: added in Session 6 per explicit product request, for UX
 * parity with Decision Room's closing sequence — an optional `commitment`
 * field (matches Decision Room's own "genuinely optional" commitment), no
 * AI call, and the step that marks the session `'completed'`. There is no
 * further post-flow sequence beyond it, unlike Decision Room.
 */
export const MirrorRoomStepIdSchema = z.enum([
  'SITUATION',
  'AUTOMATIC_REACTION',
  'PATTERN',
  'LIFE_IMPACT',
  'SYNTHESIS',
  'COMMITMENT',
])
export type MirrorRoomStepId = z.infer<typeof MirrorRoomStepIdSchema>
