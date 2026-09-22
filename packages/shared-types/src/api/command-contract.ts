import { z } from 'zod'

/**
 * The single flow-engine command contract (migration plan §11), shared by
 * Decision Room and Mirror Room — one Lambda, flowId/stepId/action in the
 * payload, prompt resolved server-side from the Prompt Registry. Do not
 * build a second, room-specific contract shape — see
 * MVP_ARCHITECTURE.md §5.2 on why this is the highest-leverage reuse point
 * in the whole build.
 */
export const FlowIdSchema = z.enum(['DECISION', 'MIRROR'])
export type FlowId = z.infer<typeof FlowIdSchema>

export const RoomCommandActionSchema = z.enum(['SUBMIT_STEP', 'REFINE', 'SKIP', 'RESUME'])
export type RoomCommandAction = z.infer<typeof RoomCommandActionSchema>

// Security review 2026-09-14 (DPNR-05): `input`'s shape varies per step
// (decision-steps.ts / mirror-steps.ts each define their own), so it can't
// be bounded field-by-field here without duplicating every step's schema.
// A ceiling on the serialized payload size closes the same unbounded-cost
// gap CompanionMessageRequestSchema's own max() closes for chat text, without
// constraining individual step input shapes.
const ROOM_COMMAND_INPUT_MAX_SERIALIZED_CHARS = 20000

export const RoomCommandRequestSchema = z.object({
  sessionId: z.string(),
  flowId: FlowIdSchema,
  stepId: z.string(), // symbolic step id (e.g. "LENS_PROSCONS") — never a UI position number
  action: RoomCommandActionSchema,
  expectedSessionVersion: z.number().int().min(0), // optimistic concurrency
  idempotencyKey: z.string(),
  input: z.record(z.string(), z.unknown()).refine((val) => JSON.stringify(val).length <= ROOM_COMMAND_INPUT_MAX_SERIALIZED_CHARS, {
    message: `input payload exceeds the ${ROOM_COMMAND_INPUT_MAX_SERIALIZED_CHARS}-character serialized limit.`,
  }),
})
export type RoomCommandRequest = z.infer<typeof RoomCommandRequestSchema>

export const RoomCommandResponseSchema = z.object({
  sessionId: z.string(),
  sessionVersion: z.number().int().min(0),
  nextStepId: z.string().nullable(), // null when the flow is complete
  result: z.record(z.string(), z.unknown()),
  promptRef: z.string().optional(), // e.g. "decision_room/emotion_reflection@v7 + overlay@v3"
  // Safety/crisis system (spec §30, docs/SAFETY_SYSTEM_DESIGN.md, ADR 0012)
  // Stage 2 — set instead of a normal step result when the command's
  // free-text input classifies as safety_concern/immediate_danger.
  // `nextStepId` stays null in that case (no step transition — "suspend
  // ordinary deep-work logic" per spec) and `result` is empty; the
  // frontend must check this field FIRST, before falling back to normal
  // step-result handling. Never present for a normal command.
  safetyIntervention: z
    .object({
      safetyState: z.enum(['safety_concern', 'immediate_danger']),
      message: z.string(),
    })
    .nullable()
    .optional(),
})
export type RoomCommandResponse = z.infer<typeof RoomCommandResponseSchema>
