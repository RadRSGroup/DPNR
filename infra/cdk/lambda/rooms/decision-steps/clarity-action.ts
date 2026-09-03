import { z } from 'zod'
import { parseValue } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { gatherDecisionContext } from './decision-context'
import type { StepDefinition } from './types'

const SubmitInput = z.object({ nextStep: z.string().min(1) })

/**
 * Post-flow "step 10" in the original. First real use of the `SKIP`
 * action anywhere in this flow — `RoomCommandActionSchema` has had it
 * since Session 4's contract work, but no step used it until now. It
 * exists precisely because ClarityToActionScreen has a real `onSkip` path
 * alongside `onCommit` (the user can decline to commit to a next step at
 * all) — this is a case where the generic action vocabulary matches a
 * real product behavior, not a speculative addition.
 *
 * `selectedFeelings` (body-feeling chips shown on this screen) are
 * captured client-side in the original but never passed to `onCommit` —
 * genuinely dropped, not persisted anywhere. Not modeled here either.
 */
export const clarityActionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE', 'SKIP'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const context = await gatherDecisionContext(ctx.crypto, ctx.pk, ctx.sessionId)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'clarity_action')
      const modelResult = await callPromptModel(version, {
        decisionTitle: context.title,
        narrative: context.narrative,
        optionA: context.optionAContent,
        optionB: context.optionBContent,
        chosenLean: context.chosenLean,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { nextStep: modelResult } : modelResult,
        promptRef: promptRef('decision_room', 'clarity_action', version),
      }
    }

    if (ctx.action === 'SKIP') {
      return { nextStepId: 'COMMITMENT', result: { nextStep: null } }
    }

    // SUBMIT_STEP — the user's (possibly AI-suggested, possibly edited)
    // committed-to text. Not persisted here either — matches the
    // original, which only carries it forward as client-side state to
    // pre-fill the next (Commitment) screen.
    const { nextStep } = parseValue(ctx.input, SubmitInput)
    return { nextStepId: 'COMMITMENT', result: { nextStep } }
  },
}
