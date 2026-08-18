import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { DECISION_ROOM_STEP_NUMBER } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, getOption, replaceTagsOfTypes, type OptionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ optionLabel: z.enum(['A', 'B']) })
const TagEntrySchema = z.object({ label: z.string().min(1), aiSuggested: z.boolean() })
const SubmitInput = z.object({
  valuesA: z.array(TagEntrySchema).min(1),
  needsA: z.array(TagEntrySchema).min(1),
  valuesB: z.array(TagEntrySchema).min(1),
  needsB: z.array(TagEntrySchema).min(1),
})

/**
 * Runs unconditionally for every lens — no `lens` branching at all, exactly
 * as the original Step06 (unlike Step05, which is lens-dependent).
 */
export const valuesNeedsStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const { optionLabel } = parseValue(ctx.input, RefineInput)
      const option = await getOption(ctx.pk, ctx.sessionId, optionLabel)
      const optionContent = stubDecryptField<OptionContent>(option.content)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'values_needs_tags')
      const stub = await callPromptModelStub(version, { optionLabel, optionText: optionContent.content })
      return {
        nextStepId: null,
        result: typeof stub === 'string' ? { values: [], needs: [] } : stub,
        promptRef: promptRef('decision_room', 'values_needs_tags', version),
      }
    }

    const { valuesA, needsA, valuesB, needsB } = parseValue(ctx.input, SubmitInput)
    const newTags = [
      ...valuesA.map((t) => ({ optionLabel: 'A' as const, tagType: 'value' as const, label: t.label, aiSuggested: t.aiSuggested })),
      ...needsA.map((t) => ({ optionLabel: 'A' as const, tagType: 'need' as const, label: t.label, aiSuggested: t.aiSuggested })),
      ...valuesB.map((t) => ({ optionLabel: 'B' as const, tagType: 'value' as const, label: t.label, aiSuggested: t.aiSuggested })),
      ...needsB.map((t) => ({ optionLabel: 'B' as const, tagType: 'need' as const, label: t.label, aiSuggested: t.aiSuggested })),
    ]
    await replaceTagsOfTypes(ctx.pk, ctx.sessionId, ['value', 'need'], newTags)

    const decision = await getDecision(ctx.pk, ctx.sessionId)
    const now = new Date().toISOString()
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...decision, currentStep: DECISION_ROOM_STEP_NUMBER.FUTURE_PROJECTION, updatedAt: now },
      })
    )

    return { nextStepId: 'FUTURE_PROJECTION', result: {} }
  },
}
