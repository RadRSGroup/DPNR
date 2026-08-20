import { z } from 'zod'
import { LensSchema, DecisionStatusSchema, TagTypeSchema, DecisionEmotionAgreementSchema } from '../dynamo/decision-room'
import { MirrorSessionStatusSchema } from '../dynamo/mirror-room'

/**
 * GET /v1/rooms/decision/{id}/full and GET /v1/rooms/mirror/{id}/full —
 * aggregate, decrypted reads (MVP_ARCHITECTURE.md §4). These mirror the
 * ROOM#DECISION#* / ROOM#MIRROR#* item families in dynamo/decision-room.ts
 * and dynamo/mirror-room.ts, but with every EncryptedBlobSchema field
 * replaced by its decrypted plain shape — this is what the client actually
 * receives after the session-ticket decrypt, never the wire-at-rest shape.
 * (POST for both rooms reuses the shared command contract in
 * command-contract.ts — see MVP_ARCHITECTURE.md §5.2 on why that's one
 * contract, not two.)
 *
 * Nullability below is ported from apps/web/supabase/migrations/001_initial_schema.sql
 * (the actual pre-migration schema, not a guess) — e.g. `subtitle`/`narrative`
 * are nullable there, `title`/tag `label` are not.
 */

export const DecisionRoomTagViewSchema = z.object({
  tagType: TagTypeSchema,
  aiSuggested: z.boolean(),
  label: z.string(),
})
export type DecisionRoomTagView = z.infer<typeof DecisionRoomTagViewSchema>

export const DecisionRoomProjectionViewSchema = z.object({
  selected: z.boolean(),
  isCustom: z.boolean(),
  statement: z.string(),
})
export type DecisionRoomProjectionView = z.infer<typeof DecisionRoomProjectionViewSchema>

export const DecisionRoomOptionViewSchema = z.object({
  label: z.enum(['A', 'B']),
  approved: z.boolean(),
  content: z.string(),
  tags: z.array(DecisionRoomTagViewSchema),
  projections: z.array(DecisionRoomProjectionViewSchema),
})
export type DecisionRoomOptionView = z.infer<typeof DecisionRoomOptionViewSchema>

export const DecisionRoomOutcomeViewSchema = z.object({
  chosenOptionLabel: z.enum(['A', 'B']).nullable(),
  reflection: z.string().nullable(),
  createdAt: z.string().datetime(),
})
export type DecisionRoomOutcomeView = z.infer<typeof DecisionRoomOutcomeViewSchema>

export const DecisionRoomFullResponseSchema = z.object({
  decisionId: z.string(),
  status: DecisionStatusSchema,
  currentStep: z.number().int().min(1).max(7),
  lens: LensSchema.nullable(),
  reviewDate: z.string().date().nullable(),
  title: z.string(),
  subtitle: z.string().nullable(),
  narrative: z.string().nullable(),
  options: z.array(DecisionRoomOptionViewSchema),
  emotion: z
    .object({
      bodyLocation: z.string().nullable(),
      emotionColor: z.string().nullable(),
      aiReflection: z.string().nullable(),
      userResponse: DecisionEmotionAgreementSchema.nullable(),
    })
    .nullable(), // null until step 3 has run
  outcomes: z.array(DecisionRoomOutcomeViewSchema),
  summary: z.string().nullable(), // null until the post-session pipeline has produced one
  // Symbolic step-engine position, sourced from the generic SessionItem
  // (dynamo/session.ts), not DecisionItem — undefined only if a DecisionItem
  // somehow exists with no matching SessionItem (shouldn't happen in
  // practice, but the read must not hard-fail on it). Lets a client resume
  // at the exact one of 14 command-contract steps instead of just the
  // coarse 1-7 `currentStep` above, which can't distinguish e.g.
  // VALUES_NEEDS from VALUES_NEEDS_SUMMARY or SESSION_SUMMARY from COMMITMENT.
  currentStepId: z.string().optional(),
  sessionVersion: z.number().int().min(0).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DecisionRoomFullResponse = z.infer<typeof DecisionRoomFullResponseSchema>

/**
 * Mirror Room has no pre-migration schema to port from (net-new per
 * MVP_ARCHITECTURE.md §5.2) — every field here is optional/nullable since a
 * session may be mid-flow with only some fields captured. Refine once
 * Slice 2 is actually being built, same caveat as dynamo/mirror-room.ts.
 */
export const MirrorRoomFullResponseSchema = z.object({
  mirrorId: z.string(),
  status: MirrorSessionStatusSchema,
  currentStepId: z.string().optional(),
  // Sourced from the generic SessionItem (dynamo/session.ts), same as
  // DecisionRoomFullResponseSchema's own field — lets a client resume
  // exactly (POST /v1/rooms/mirror requires expectedSessionVersion).
  sessionVersion: z.number().int().min(0).optional(),
  situation: z.string().optional(),
  trigger: z.string().optional(),
  thought: z.string().optional(),
  emotion: z.string().optional(),
  bodyResponse: z.string().optional(),
  automaticReaction: z.string().optional(),
  copingResponse: z.string().optional(),
  recurringPattern: z.string().optional(),
  energyMoodEffect: z.string().optional(),
  lifeDomain: z.string().optional(),
  commitment: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type MirrorRoomFullResponse = z.infer<typeof MirrorRoomFullResponseSchema>
