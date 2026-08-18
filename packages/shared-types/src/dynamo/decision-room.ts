import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/**
 * Ports apps/web/supabase/migrations/001_initial_schema.sql onto the
 * single-table design (MVP_ARCHITECTURE.md §3.1 / §5.3). Field split
 * (plaintext structural vs. encrypted content) follows
 * aws-migration-plan.html §6.4 and §5's item-level [ENCRYPTED] markers.
 */

export const LensSchema = z.enum(['pros_cons', 'fears_desires', 'values_needs'])
export type Lens = z.infer<typeof LensSchema>

/**
 * Symbolic step ids for the room command contract (api/command-contract.ts:
 * `stepId` must be "symbolic ... never a UI position number"). The
 * pre-migration UI's 7 numbered steps map 1:1 onto these — ported from
 * apps/web/src/lib/types.ts's STEP_LABELS 1-7, not renumbered or
 * reinterpreted. `DecisionItem.currentStep` keeps the original numeric
 * column (ported from the SQL schema) for storage; DECISION_ROOM_STEP_NUMBER
 * is the only place that maps between the two — never hand-convert elsewhere.
 */
export const DecisionRoomStepIdSchema = z.enum([
  'NAME_DECISION',
  'MAP_OPTIONS',
  'BODY_EMOTION',
  'CHOOSE_LENS',
  'DEEP_EXPLORATION',
  'VALUES_NEEDS',
  'FUTURE_PROJECTION',
])
export type DecisionRoomStepId = z.infer<typeof DecisionRoomStepIdSchema>

export const DECISION_ROOM_STEP_NUMBER: Record<DecisionRoomStepId, number> = {
  NAME_DECISION: 1,
  MAP_OPTIONS: 2,
  BODY_EMOTION: 3,
  CHOOSE_LENS: 4,
  DEEP_EXPLORATION: 5,
  VALUES_NEEDS: 6,
  FUTURE_PROJECTION: 7,
}

export const DECISION_ROOM_STEP_ORDER: DecisionRoomStepId[] = [
  'NAME_DECISION',
  'MAP_OPTIONS',
  'BODY_EMOTION',
  'CHOOSE_LENS',
  'DEEP_EXPLORATION',
  'VALUES_NEEDS',
  'FUTURE_PROJECTION',
]

export const DecisionStatusSchema = z.enum(['active', 'completed', 'archived'])
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>

export const DecisionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionRoom(decisionId)
  decisionId: z.string(),
  status: DecisionStatusSchema,
  currentStep: z.number().int().min(1).max(7),
  lens: LensSchema.nullable(),
  reviewDate: z.string().date().nullable(),
  content: EncryptedBlobSchema, // wraps { title, subtitle, narrative }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type DecisionItem = z.infer<typeof DecisionItemSchema>

export const DecisionOptionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionOption(decisionId, label)
  label: z.enum(['A', 'B']),
  approved: z.boolean(),
  content: EncryptedBlobSchema, // wraps { content: string }
  createdAt: z.string().datetime(),
})
export type DecisionOptionItem = z.infer<typeof DecisionOptionItemSchema>

/** User's reaction to the AI's emotion-reflection suggestion (ported from emotion_maps.user_response). */
export const DecisionEmotionAgreementSchema = z.enum(['accurate', 'refine', 'not_sure', 'partly_true'])
export type DecisionEmotionAgreement = z.infer<typeof DecisionEmotionAgreementSchema>

/** Whole item encrypted, matching the migration plan §5 schema's item-level [ENCRYPTED] marker. */
export const DecisionEmotionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionEmotion(decisionId)
  content: EncryptedBlobSchema, // wraps { bodyLocation, emotionColor, aiReflection, userResponse }
  createdAt: z.string().datetime(),
})
export type DecisionEmotionItem = z.infer<typeof DecisionEmotionItemSchema>

export const TagTypeSchema = z.enum(['pro', 'con', 'desire', 'fear', 'value', 'need'])
export type TagType = z.infer<typeof TagTypeSchema>

export const DecisionTagItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionTag(decisionId, tagId)
  optionLabel: z.enum(['A', 'B']).optional(), // fear/desire tags are option-agnostic (HANDOVER.md)
  tagType: TagTypeSchema,
  aiSuggested: z.boolean(),
  content: EncryptedBlobSchema, // wraps { label: string }
  createdAt: z.string().datetime(),
})
export type DecisionTagItem = z.infer<typeof DecisionTagItemSchema>

export const DecisionProjectionItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionProjection(decisionId, projectionId)
  optionLabel: z.enum(['A', 'B']),
  selected: z.boolean(), // implicit preference signal — kept plaintext, matches original schema
  isCustom: z.boolean(),
  content: EncryptedBlobSchema, // wraps { statement: string }
  createdAt: z.string().datetime(),
})
export type DecisionProjectionItem = z.infer<typeof DecisionProjectionItemSchema>

export const DecisionOutcomeItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionOutcome(decisionId, isoTimestamp)
  chosenOptionLabel: z.enum(['A', 'B']).nullable(),
  content: EncryptedBlobSchema, // wraps { reflection: string }
  createdAt: z.string().datetime(),
})
export type DecisionOutcomeItem = z.infer<typeof DecisionOutcomeItemSchema>

/** USER#<id> / ROOM#DECISION#<id>#SUMMARY — AI decision summary (MVP_ARCHITECTURE.md §3.1). */
export const DecisionSummaryItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.decisionSummary(decisionId)
  content: EncryptedBlobSchema, // wraps { summary: string }
  promptRef: z.string(),
  createdAt: z.string().datetime(),
})
export type DecisionSummaryItem = z.infer<typeof DecisionSummaryItemSchema>
