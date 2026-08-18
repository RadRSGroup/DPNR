import type { FlowDefinition } from '../types'
import { situationStep } from './situation'
import { automaticReactionStep } from './automatic-reaction'
import { patternStep } from './pattern'
import { lifeImpactStep } from './life-impact'
import { synthesisStep } from './synthesis'
import { commitmentStep } from './commitment'

/**
 * Mirror Room's step map — SITUATION → AUTOMATIC_REACTION → PATTERN →
 * LIFE_IMPACT → SYNTHESIS → COMMITMENT. Session 5 designed the first five
 * steps as a first pass (no existing implementation or spec docx was
 * available); Session 6 got explicit product review and approval of that
 * grouping and both prompts, then added COMMITMENT at the user's request
 * for UX parity with Decision Room's closing sequence — see
 * packages/shared-types/src/dynamo/mirror-room.ts's doc comment for the
 * full history. Treat this step map as settled now, same status as
 * Decision Room's.
 *
 * Reuses the exact same flow-engine machinery Decision Room proved out
 * (session bookkeeping, optimistic concurrency, idempotency,
 * REFINE-generates/SUBMIT_STEP-persists convention) — see
 * lambda/rooms/command.ts. No interstitial "section summary" screens
 * here (Mirror Room's data model is one flat item, not Decision Room's
 * many separate tag/option/projection items — there's nothing analogous
 * to summarize mid-flow).
 */
export const mirrorFlow: FlowDefinition = {
  firstStepId: 'SITUATION',
  steps: {
    SITUATION: situationStep,
    AUTOMATIC_REACTION: automaticReactionStep,
    PATTERN: patternStep,
    LIFE_IMPACT: lifeImpactStep,
    SYNTHESIS: synthesisStep,
    COMMITMENT: commitmentStep,
  },
}
