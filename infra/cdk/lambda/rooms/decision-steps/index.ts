import type { FlowDefinition } from './types'
import { nameDecisionStep } from './name-decision'
import { mapOptionsStep } from './map-options'
import { bodyEmotionStep } from './body-emotion'
import { chooseLensStep } from './choose-lens'
import { deepExplorationStep } from './deep-exploration'
import { valuesNeedsStep } from './values-needs'
import { futureProjectionStep } from './future-projection'
import { deepExplorationSummaryStep, valuesNeedsSummaryStep, futureProjectionSummaryStep } from './section-summary'
import { sessionSummaryStep } from './session-summary'
import { summaryInsightStep } from './summary-insight'
import { clarityActionStep } from './clarity-action'
import { commitmentStep } from './commitment'

/**
 * The complete original Decision Room flow, ported across Session 5:
 * 7 structural steps (`NAME_DECISION` → `FUTURE_PROJECTION`), 3 mid-flow
 * `SectionSummaryScreen` interstitials (`DEEP_EXPLORATION_SUMMARY`,
 * `VALUES_NEEDS_SUMMARY`, `FUTURE_PROJECTION_SUMMARY` — gate the
 * transitions after Step05/06/07 exactly as the original does, including
 * which ones actually advance `DecisionItem.currentStep`), and the
 * post-flow summary sequence (`SESSION_SUMMARY` → `SUMMARY_INSIGHT` →
 * `CLARITY_ACTION` → `COMMITMENT`). See docs/AGENT_LOG.md for the full
 * step-by-step mapping this was built from (prompt names, lens branching,
 * and the flagged ambiguities/dead code in the original UI), and
 * `DecisionRoomStepIdSchema`/`DecisionRoomSectionSummaryStepIdSchema`/
 * `DecisionRoomPostFlowStepIdSchema` in
 * packages/shared-types/src/dynamo/decision-room.ts for how these 3
 * families of step ids relate to each other and to `currentStep`.
 *
 * `FUTURE_PROJECTION` sets `DecisionItem.status` to `'completed'` but
 * does NOT end the session (`sessionComplete`) — only `COMMITMENT` does,
 * matching the original exactly (the post-flow screens all run after the
 * decision is already "completed" in the product sense).
 *
 * NOT modeled as steps, on purpose: `CelebrationScreen`/`CompletionScreen`
 * (pure client-side transitions, no AI, no persistence, nothing for a
 * backend step to do).
 */
export const decisionFlow: FlowDefinition = {
  firstStepId: 'NAME_DECISION',
  steps: {
    NAME_DECISION: nameDecisionStep,
    MAP_OPTIONS: mapOptionsStep,
    BODY_EMOTION: bodyEmotionStep,
    CHOOSE_LENS: chooseLensStep,
    DEEP_EXPLORATION: deepExplorationStep,
    DEEP_EXPLORATION_SUMMARY: deepExplorationSummaryStep,
    VALUES_NEEDS: valuesNeedsStep,
    VALUES_NEEDS_SUMMARY: valuesNeedsSummaryStep,
    FUTURE_PROJECTION: futureProjectionStep,
    FUTURE_PROJECTION_SUMMARY: futureProjectionSummaryStep,
    SESSION_SUMMARY: sessionSummaryStep,
    SUMMARY_INSIGHT: summaryInsightStep,
    CLARITY_ACTION: clarityActionStep,
    COMMITMENT: commitmentStep,
  },
}
