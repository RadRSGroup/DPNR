import type { FlowDefinition } from './types'
import { nameDecisionStep } from './name-decision'
import { mapOptionsStep } from './map-options'
import { bodyEmotionStep } from './body-emotion'
import { chooseLensStep } from './choose-lens'
import { deepExplorationStep } from './deep-exploration'
import { valuesNeedsStep } from './values-needs'
import { futureProjectionStep } from './future-projection'

/**
 * All 7 structural steps of the original Decision Room, ported this
 * session — see docs/AGENT_LOG.md for the full step-by-step mapping this
 * was built from (prompt names, lens branching, and the flagged
 * ambiguities/dead code in the original UI). The post-flow summary
 * sequence (session_summary → insight → clarity_action → commitment →
 * completion) is explicitly NOT part of this — a separate, not-yet-built
 * concern, not an oversight.
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
  },
}
