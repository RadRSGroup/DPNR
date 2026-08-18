import type { RoomCommandAction } from '@dpnr/shared-types'

export interface StepContext {
  pk: string
  sessionId: string
  action: RoomCommandAction
  input: Record<string, unknown>
}

export interface StepResult {
  nextStepId: string | null // null = stay on this step (an AI-assist call) OR the flow has no further step
  result: Record<string, unknown>
  promptRef?: string
  /** Set true only by the step that finishes the whole flow (e.g. FUTURE_PROJECTION's SUBMIT_STEP) — marks the SessionItem completed and blocks further commands against it. */
  sessionComplete?: boolean
}

export interface StepDefinition {
  allowedActions: RoomCommandAction[]
  handle(ctx: StepContext): Promise<StepResult>
}

export interface FlowDefinition {
  firstStepId: string
  steps: Record<string, StepDefinition>
}
