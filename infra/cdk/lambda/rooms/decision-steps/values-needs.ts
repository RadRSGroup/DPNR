import { z } from 'zod'
import { parseValue } from '../../lib/http'
import { stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getOption, replaceTagsOfTypes, type OptionContent } from './helpers'
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

    // DecisionItem.currentStep does NOT advance here — matches the original:
    // `completeStep06` persists tags but current_step only becomes 7 once
    // the SectionSummaryScreen interstitial is dismissed
    // (VALUES_NEEDS_SUMMARY's own SUBMIT_STEP does that).
    return { nextStepId: 'VALUES_NEEDS_SUMMARY', result: {} }
  },
}
