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

export const RoomCommandRequestSchema = z.object({
  sessionId: z.string(),
  flowId: FlowIdSchema,
  stepId: z.string(), // symbolic step id (e.g. "LENS_PROSCONS") — never a UI position number
  action: RoomCommandActionSchema,
  expectedSessionVersion: z.number().int().min(0), // optimistic concurrency
  idempotencyKey: z.string(),
  input: z.record(z.string(), z.unknown()),
})
export type RoomCommandRequest = z.infer<typeof RoomCommandRequestSchema>

export const RoomCommandResponseSchema = z.object({
  sessionId: z.string(),
  sessionVersion: z.number().int().min(0),
  nextStepId: z.string().nullable(), // null when the flow is complete
  result: z.record(z.string(), z.unknown()),
  promptRef: z.string().optional(), // e.g. "decision_room/emotion_reflection@v7 + overlay@v3"
})
export type RoomCommandResponse = z.infer<typeof RoomCommandResponseSchema>
