import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'
import { BodyAreaSchema, EmotionFeltSchema, BodyPlacementSchema, type BodyArea, type EmotionFelt, type BodyPlacement } from './felt'

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

/**
 * Session 72 (Wave 2 Slice 3, founder feedback #34/#35, user-approved
 * 2026-09-27). All of these live INSIDE the encrypted `content` blob, never
 * as plaintext item attributes, and are optional so sessions saved before
 * this slice still read cleanly.
 *
 * `entry` — how the person came in from the landing (Appendix B "entry-aware
 * adaptation"). A pattern/archetype is recorded only if the person kept it in
 * their own step-1 text, so the AI never sees context the person removed.
 */
export const MirrorEntryModeSchema = z.enum(['situation', 'pattern', 'archetype'])
export const MirrorEntrySchema = z.object({
  mode: MirrorEntryModeSchema,
  patternName: z.string().max(80).optional(),
  patternDescription: z.string().max(1000).optional(),
  archetype: z.string().max(40).optional(),
})
export type MirrorEntry = z.infer<typeof MirrorEntrySchema>

/**
 * Emotion + body capture (#35). The person picks emotions (Decision Room's
 * EMOTION_COLORS palette) and places each one on the body themselves — DPNR
 * never picks or suggests a location (Appendix B). Descriptive only: nothing
 * here is scored.
 */
// Room-neutral definitions live in ./felt (the Decision Room uses them too since
// Slice 5b); these Mirror names are kept as aliases for existing callers.
export const MirrorBodyAreaSchema = BodyAreaSchema
export type MirrorBodyArea = BodyArea
export const MirrorEmotionFeltSchema = EmotionFeltSchema
export type MirrorEmotionFelt = EmotionFelt
export const MirrorBodyPlacementSchema = BodyPlacementSchema
export type MirrorBodyPlacement = BodyPlacement

export const MirrorSessionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.mirrorRoom(mirrorId)
  mirrorId: z.string(),
  status: MirrorSessionStatusSchema,
  currentStepId: z.string().optional(),
  content: EncryptedBlobSchema, // wraps { situation, trigger, thought, emotion, bodyResponse, automaticReaction, copingResponse, recurringPattern, energyMoodEffect, lifeDomain, commitment, entry?, emotionsFelt?, bodyPlacements?, synthesis? }
  // Intelligence Spec §18/Appendix B Flow 1 "Mirror receives context (topic
  // + domain + source session)" — set only when the session was started via
  // a Library topic's "Explore in Mirror Room" action (LibrarySidePanel.tsx).
  // Plaintext catalog slug, not personal data — same non-sensitive-config
  // reasoning LibraryTopicVersionItem's own taxonomyCategory already gets.
  // Traceability only this pass — not yet threaded into the room's own AI
  // prompts (a separate, deeper prompt-engineering task).
  sourceLibraryTopic: z.string().optional(),
  // Set the first time COMMITMENT grants the "Complete a Reflection" credit,
  // so a reopened-and-refinished session (REOPEN, Session 67) can't earn it
  // again. Carried over by every step's write.
  reflectionCreditGrantedAt: z.string().datetime().optional(),
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
