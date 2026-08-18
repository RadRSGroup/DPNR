import type { FlowDefinition } from '../types'
import { situationStep } from './situation'
import { automaticReactionStep } from './automatic-reaction'
import { patternStep } from './pattern'
import { lifeImpactStep } from './life-impact'
import { synthesisStep } from './synthesis'

/**
 * Mirror Room's first-pass step map — SITUATION → AUTOMATIC_REACTION →
 * PATTERN → LIFE_IMPACT → SYNTHESIS. This is a reasonable draft this
 * session designed from MVP_ARCHITECTURE.md §5.2's one-line arc, NOT a
 * port of an existing implementation (none exists) and NOT sourced from
 * the product spec docx (unavailable this session) — see
 * packages/shared-types/src/dynamo/mirror-room.ts's doc comment before
 * treating this grouping, or the `mirror_room` prompts it calls
 * (infra/cdk/scripts/mirror-room-prompts.seed.ts), as locked.
 *
 * Reuses the exact same flow-engine machinery Decision Room proved out
 * (session bookkeeping, optimistic concurrency, idempotency,
 * REFINE-generates/SUBMIT_STEP-persists convention) — see
 * lambda/rooms/command.ts. No interstitial "section summary" screens
 * here (Mirror Room's data model is one flat item, not Decision Room's
 * many separate tag/option/projection items — there's nothing analogous
 * to summarize mid-flow), and no post-flow sequence beyond SYNTHESIS.
 */
export const mirrorFlow: FlowDefinition = {
  firstStepId: 'SITUATION',
  steps: {
    SITUATION: situationStep,
    AUTOMATIC_REACTION: automaticReactionStep,
    PATTERN: patternStep,
    LIFE_IMPACT: lifeImpactStep,
    SYNTHESIS: synthesisStep,
  },
}
