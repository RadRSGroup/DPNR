import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/**
 * Mirror Room schema. The MVP spec gives a prompt-logic outline and a
 * data-captured list (situation, trigger, thought, emotion, body
 * response, automatic reaction, coping/protective response, recurring
 * pattern, energy/mood effect, life domain) but not a formal step machine
 * the way Decision Room's pre-migration UI had one to port from.
 *
 * `MirrorRoomStepIdSchema` below is this session's own reasonable first
 * pass at grouping those 10 already-committed fields into a step
 * sequence loosely following MVP_ARCHITECTURE.md §5.2's one-line arc
 * ("situation → automatic reaction → trigger people → trigger situations
 * → shape the character") — it is NOT sourced from the actual product
 * spec docx (unavailable this session) and should be treated as a
 * flagged-for-review draft, not a locked design, unlike Decision Room's
 * step map (which faithfully ports a real, already-shipped UI). The 10
 * data fields themselves are NOT new — they were already committed
 * before this session; only their grouping into steps is new.
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

/**
 * First-pass step grouping of the 10 already-committed content fields —
 * see the file doc comment above for why this is a draft, not a port.
 * SITUATION: situation, trigger. AUTOMATIC_REACTION: thought, emotion,
 * bodyResponse, automaticReaction (the in-the-moment cluster — what they
 * thought, felt, sensed in the body, and actually did/said; also one of
 * two AI touchpoints in this flow, mirroring Decision Room's
 * emotion_reflection). PATTERN: copingResponse (how they tried to
 * protect/cope afterward — distinct from `automaticReaction`'s in-the-
 * moment behavior), recurringPattern (widens from this one incident to a
 * recurring pattern — "trigger people/trigger situations" in the
 * architecture doc's phrase). LIFE_IMPACT: energyMoodEffect, lifeDomain
 * ("shape the character"). SYNTHESIS: no new fields — a closing
 * restatement/synthesis prompt (added at the user's request, for UX
 * consistency with Decision Room's own closing sequence) and the step
 * that marks the session `'completed'`; there is no further post-flow
 * sequence defined for Mirror Room the way Decision Room has one.
 */
export const MirrorRoomStepIdSchema = z.enum(['SITUATION', 'AUTOMATIC_REACTION', 'PATTERN', 'LIFE_IMPACT', 'SYNTHESIS'])
export type MirrorRoomStepId = z.infer<typeof MirrorRoomStepIdSchema>
