import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, type DecisionProjectionItem, type DecisionOutcomeItem } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, getOption, type DecisionContent, type OptionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ optionLabel: z.enum(['A', 'B']) })
const ProjectionEntry = z.object({ statement: z.string().min(1), isCustom: z.boolean() })
const SubmitInput = z.object({
  projectionsA: z.array(ProjectionEntry).min(1),
  projectionsB: z.array(ProjectionEntry).min(1),
  chosenLean: z.enum(['A', 'B', 'undecided']),
  reflectionNote: z.string().max(200).optional(),
})

function buildProjectionItem(
  pk: string,
  decisionId: string,
  optionLabel: 'A' | 'B',
  p: { statement: string; isCustom: boolean },
  now: string
): DecisionProjectionItem {
  return {
    pk,
    sk: Sk.decisionProjection(decisionId, randomUUID()),
    optionLabel,
    selected: true, // these are exactly the ones the user kept — matches the original's "save only selected statements" semantics
    isCustom: p.isCustom,
    content: stubEncryptField({ statement: p.statement }),
    createdAt: now,
  }
}

/**
 * Last of the 7 structural steps. `nextStepId: null` on SUBMIT_STEP means
 * end of this engine's step map, not an error — the original app's
 * post-flow sequence (session_summary → insight → clarity_action →
 * commitment → completion) is deliberately out of scope this session, see
 * docs/AGENT_LOG.md. The original's two internal UI phases ("projections"
 * then "reflect") map onto REFINE (fetch candidate statements for one
 * option, doesn't advance) and SUBMIT_STEP (final commit with the user's
 * kept/edited statements + lean + note) — same REFINE/SUBMIT_STEP split
 * used by every other AI-assisted step in this flow.
 */
export const futureProjectionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const { optionLabel } = parseValue(ctx.input, RefineInput)
      const [decision, option] = await Promise.all([
        getDecision(ctx.pk, ctx.sessionId),
        getOption(ctx.pk, ctx.sessionId, optionLabel),
      ])
      const decisionContent = stubDecryptField<DecisionContent>(decision.content)
      const optionContent = stubDecryptField<OptionContent>(option.content)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'future_projection')
      const stub = await callPromptModelStub(version, {
        decisionTitle: decisionContent.title,
        // Matches the original: an empty string when there's no narrative,
        // never a conditional inside the template itself (established
        // convention — see decision-room-prompts.seed.ts's top comment).
        contextLine: decisionContent.narrative ? `\nContext: ${decisionContent.narrative}` : '',
        optionLabel,
        optionText: optionContent.content,
      })
      return {
        nextStepId: null,
        result: typeof stub === 'string' ? { statements: [] } : stub,
        promptRef: promptRef('decision_room', 'future_projection', version),
      }
    }

    const { projectionsA, projectionsB, chosenLean, reflectionNote } = parseValue(ctx.input, SubmitInput)
    const now = new Date().toISOString()

    const projectionItems = [
      ...projectionsA.map((p) => buildProjectionItem(ctx.pk, ctx.sessionId, 'A', p, now)),
      ...projectionsB.map((p) => buildProjectionItem(ctx.pk, ctx.sessionId, 'B', p, now)),
    ]

    const outcomeItem: DecisionOutcomeItem = {
      pk: ctx.pk,
      sk: Sk.decisionOutcome(ctx.sessionId, now),
      chosenOptionLabel: chosenLean === 'undecided' ? null : chosenLean,
      content: stubEncryptField({
        reflection: `Leaning: ${chosenLean}.${reflectionNote ? ` ${reflectionNote}` : ''}`,
      }),
      createdAt: now,
    }

    const decision = await getDecision(ctx.pk, ctx.sessionId)
    const updatedDecision = {
      ...decision,
      status: 'completed' as const,
      currentStep: DECISION_ROOM_STEP_NUMBER.FUTURE_PROJECTION,
      updatedAt: now,
    }

    await Promise.all([
      ...projectionItems.map((item) => ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: outcomeItem })),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedDecision })),
    ])

    // NOT sessionComplete here, even though DecisionItem.status is now
    // 'completed' — matches the original exactly: `completeStep07` sets
    // status:'completed' AND current_step:7 immediately (unlike Step05/06,
    // whose current_step advance is deferred to their own interstitial —
    // Step07's isn't, because current_step is already maxed at 7 by this
    // point), but the app keeps interacting with this same decision
    // through the whole post-flow summary sequence afterward.
    // "Product-visible completion" and "engine stops accepting commands"
    // are different things; only COMMITMENT (the real end of the flow,
    // matching the original's finishFlow) sets sessionComplete. The
    // FUTURE_PROJECTION_SUMMARY interstitial that follows only gates the
    // client-side transition into the post-flow sequence, same as the
    // original's `postFlow = 'session_summary'`.
    return { nextStepId: 'FUTURE_PROJECTION_SUMMARY', result: { chosenLean } }
  },
}
