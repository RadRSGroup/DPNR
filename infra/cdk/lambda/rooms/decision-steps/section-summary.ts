import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { DECISION_ROOM_STEP_NUMBER, type DecisionItem, type Lens } from '@dpnr/shared-types'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision } from './helpers'
import { gatherDecisionContext, optionCBlock, type GatheredDecisionContext } from './decision-context'
import { tagKindForLens } from './deep-exploration'
import type { StepDefinition } from './types'

/**
 * The 3 `SectionSummaryScreen` interstitials — same component reused after
 * Step05, Step06, and Step07 in the original, each with a different
 * `stepType` and a different set of "selections" fed to the `section_summary`
 * prompt. All 3 share this exact shape: `REFINE` generates content (nothing
 * persisted — the original's own "agreement" UI on this screen is
 * unpersisted too, same as SESSION_SUMMARY/SUMMARY_INSIGHT), `SUBMIT_STEP`
 * just advances. See DecisionRoomSectionSummaryStepIdSchema's doc comment
 * (packages/shared-types/src/dynamo/decision-room.ts) for which one
 * advances `DecisionItem.currentStep` and which doesn't.
 */
interface SectionSummaryConfig {
  nextStepId: string
  /** Set only for the 2 interstitials that own the currentStep advance (see the schema doc comment) — undefined for FUTURE_PROJECTION_SUMMARY, which doesn't touch DecisionItem at all. */
  advanceCurrentStepTo?: number
  /** The lens this summary closes; recorded in `completedLenses` on continue (2026-09-28 #6/#7). */
  completesLens?: (decision: DecisionItem) => Lens
  computeStepTypeAndSelections(
    pk: string,
    sessionId: string,
    context: GatheredDecisionContext
  ): Promise<{ stepType: string; selectionsA: string; selectionsB: string; selectionsC: string }>
}

function createSectionSummaryStep(config: SectionSummaryConfig): StepDefinition {
  return {
    allowedActions: ['SUBMIT_STEP', 'REFINE'],
    handle: async (ctx) => {
      if (ctx.action === 'REFINE') {
        const context = await gatherDecisionContext(ctx.crypto, ctx.pk, ctx.sessionId)
        const { stepType, selectionsA, selectionsB, selectionsC } = await config.computeStepTypeAndSelections(
          ctx.pk,
          ctx.sessionId,
          context
        )
        const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'section_summary')
        const modelResult = await callPromptModel(version, {
          decisionTitle: context.title,
          step: stepType,
          optionA: context.optionAContent,
          optionB: context.optionBContent,
          selectionsA,
          selectionsB,
          optionCBlock: optionCBlock(context, selectionsC),
          languageInstruction: ctx.languageInstruction,
        })
        return {
          nextStepId: null,
          result: typeof modelResult === 'string' ? { wordFromUs: modelResult, reflection: modelResult } : modelResult,
          promptRef: promptRef('decision_room', 'section_summary', version),
        }
      }

      if (config.advanceCurrentStepTo !== undefined) {
        const decision = await getDecision(ctx.pk, ctx.sessionId)
        const now = new Date().toISOString()
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...decision,
              currentStep: config.advanceCurrentStepTo,
              ...(config.completesLens ? { completedLenses: addLens(decision.completedLenses, config.completesLens(decision)) } : {}),
              updatedAt: now,
            },
          })
        )
      }

      return { nextStepId: config.nextStepId, result: {} }
    },
  }
}

/** Adds a lens once, keeping the order the person explored them in. */
export function addLens(done: Lens[] | undefined, lens: Lens): Lens[] {
  const list = done ?? []
  return list.includes(lens) ? list : [...list, lens]
}

// Both lens summaries return to CHOOSE_LENS (all three lenses, any order).
// Before 2026-09-28 this went on to VALUES_NEEDS, which then always ran.
export const deepExplorationSummaryStep = createSectionSummaryStep({
  nextStepId: 'CHOOSE_LENS',
  advanceCurrentStepTo: DECISION_ROOM_STEP_NUMBER.CHOOSE_LENS,
  // A pre-2026-09-28 decision could run Step05 under the values_needs lens
  // (as Desires/Fears); that counts as the Fears & Desires lens.
  completesLens: (decision) => (decision.lens === 'pros_cons' ? 'pros_cons' : 'fears_desires'),
  computeStepTypeAndSelections: async (pk, sessionId, context) => {
    const decision = await getDecision(pk, sessionId)
    const kind = decision.lens ? tagKindForLens(decision.lens) : 'pros_cons'
    const selectionsA =
      kind === 'pros_cons'
        ? [...context.tagsA.pro, ...context.tagsA.con].join(', ')
        : [...context.tagsA.desire, ...context.tagsA.fear].join(', ')
    const selectionsB =
      kind === 'pros_cons'
        ? [...context.tagsB.pro, ...context.tagsB.con].join(', ')
        : [...context.tagsB.desire, ...context.tagsB.fear].join(', ')
    const selectionsC =
      kind === 'pros_cons'
        ? [...context.tagsC.pro, ...context.tagsC.con].join(', ')
        : [...context.tagsC.desire, ...context.tagsC.fear].join(', ')
    return { stepType: kind, selectionsA, selectionsB, selectionsC }
  },
})

export const valuesNeedsSummaryStep = createSectionSummaryStep({
  nextStepId: 'CHOOSE_LENS',
  advanceCurrentStepTo: DECISION_ROOM_STEP_NUMBER.CHOOSE_LENS,
  completesLens: () => 'values_needs',
  computeStepTypeAndSelections: async (_pk, _sessionId, context) => ({
    stepType: 'values_needs',
    selectionsA: [...context.tagsA.value, ...context.tagsA.need].join(', '),
    selectionsB: [...context.tagsB.value, ...context.tagsB.need].join(', '),
    selectionsC: [...context.tagsC.value, ...context.tagsC.need].join(', '),
  }),
})

export const futureProjectionSummaryStep = createSectionSummaryStep({
  nextStepId: 'SESSION_SUMMARY',
  // No advanceCurrentStepTo — FUTURE_PROJECTION already set currentStep:7
  // immediately (see that step's own comment); this interstitial only
  // gates the client-side transition into the post-flow sequence.
  computeStepTypeAndSelections: async (_pk, _sessionId, context) => ({
    stepType: 'projections',
    selectionsA: context.projectionsA.join(', '),
    selectionsB: context.projectionsB.join(', '),
    selectionsC: context.projectionsC.join(', '),
  }),
})
