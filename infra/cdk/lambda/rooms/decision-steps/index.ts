import type { FlowDefinition } from './types'
import { nameDecisionStep } from './name-decision'
import { mapOptionsStep } from './map-options'
import { bodyEmotionStep } from './body-emotion'
import { chooseLensStep } from './choose-lens'
import { deepExplorationStep } from './deep-exploration'
import { valuesNeedsStep } from './values-needs'
import { futureProjectionStep } from './future-projection'
import { sessionSummaryStep } from './session-summary'
import { summaryInsightStep } from './summary-insight'
import { clarityActionStep } from './clarity-action'
import { commitmentStep } from './commitment'

/**
 * All 7 structural steps of the original Decision Room (`NAME_DECISION`
 * through `FUTURE_PROJECTION`, ported Session 5) plus the post-flow
 * summary sequence (`SESSION_SUMMARY` → `SUMMARY_INSIGHT` →
 * `CLARITY_ACTION` → `COMMITMENT`, ported Session 5 continued) — see
 * docs/AGENT_LOG.md for the full step-by-step mapping this was built
 * from (prompt names, lens branching, and the flagged ambiguities/dead
 * code in the original UI).
 *
 * `FUTURE_PROJECTION` sets `DecisionItem.status` to `'completed'` but
 * does NOT end the session (`sessionComplete`) — only `COMMITMENT` does,
 * matching the original exactly (the post-flow screens all run after the
 * decision is already "completed" in the product sense). See
 * `DecisionRoomPostFlowStepIdSchema`'s doc comment in
 * packages/shared-types/src/dynamo/decision-room.ts.
 *
 * NOT modeled as steps, on purpose: the 3 interstitial
 * `SectionSummaryScreen` calls the original shows after Step05/06/07
 * (their own separate, not-yet-designed concern — see docs/AGENT_LOG.md),
 * and CelebrationScreen/CompletionScreen (pure client-side transitions,
 * no AI, no persistence, nothing for a backend step to do).
 */
export const decisionFlow: FlowDefinition = {
  firstStepId: 'NAME_DECISION',
  steps: {
    NAME_DECISION: nameDecisionStep,
    MAP_OPTIONS: mapOptionsStep,
    BODY_EMOTION: bodyEmotionStep,
    CHOOSE_LENS: chooseLensStep,
    DEEP_EXPLORATION: deepExplorationStep,
    VALUES_NEEDS: valuesNeedsStep,
    FUTURE_PROJECTION: futureProjectionStep,
    SESSION_SUMMARY: sessionSummaryStep,
    SUMMARY_INSIGHT: summaryInsightStep,
    CLARITY_ACTION: clarityActionStep,
    COMMITMENT: commitmentStep,
  },
}
