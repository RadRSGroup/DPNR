import type { RoomCommandAction } from '@dpnr/shared-types'
import type { SessionCrypto } from '../lib/session-crypto'

export interface StepContext {
  pk: string
  sessionId: string
  action: RoomCommandAction
  input: Record<string, unknown>
  crypto: SessionCrypto
  /**
   * Hebrew Localization Slice E (docs/HEBREW_LOCALIZATION_PLAN.md §4.3) —
   * the one instruction sentence every model-calling step passes to
   * `callPromptModel` as `{{languageInstruction}}`, resolved once in
   * `command.ts` from the `UserProfileItem` `requireConsent()` already
   * returns (no extra read), same pattern `companion/message.ts` uses.
   */
  languageInstruction: string
}

export interface StepResult {
  nextStepId: string | null // null = stay on this step (an AI-assist call) OR the flow has no further step
  result: Record<string, unknown>
  promptRef?: string
  /** Set true only by the step that finishes the whole flow (e.g. Decision Room's COMMITMENT). Marks the SessionItem completed and blocks further commands against it. */
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
