import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { gatherDecisionContext } from './decision-context'
import type { StepDefinition } from './types'

/**
 * Post-flow "step 9" in the original. `exploredTags` is ONLY the
 * projection statements (`[...projectionsA, ...projectionsB].slice(0,30)`)
 * — despite its name, the original never includes pros/cons/values/needs
 * tags here (flagged during the Session 5 step mapping as a real quirk,
 * preserved faithfully, not "fixed" to match what the name implies).
 * Nothing is persisted on this screen either, same as SESSION_SUMMARY.
 */
export const summaryInsightStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const context = await gatherDecisionContext(ctx.pk, ctx.sessionId)
      const exploredTags = [...context.projectionsA, ...context.projectionsB].slice(0, 30).join(', ')
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'summary_insight')
      const stub = await callPromptModelStub(version, {
        decisionTitle: context.title,
        narrative: context.narrative,
        optionA: context.optionAContent,
        optionB: context.optionBContent,
        exploredTags,
      })
      return {
        nextStepId: null,
        result: typeof stub === 'string' ? { insight: stub } : stub,
        promptRef: promptRef('decision_room', 'summary_insight', version),
      }
    }

    return { nextStepId: 'CLARITY_ACTION', result: {} }
  },
}
