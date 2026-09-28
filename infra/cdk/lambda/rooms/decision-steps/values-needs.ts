import { z } from 'zod'
import { DecisionOptionLabelSchema, type DecisionOptionLabel } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getOption, hasOptionC, replaceTagsOfTypes, type OptionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ optionLabel: DecisionOptionLabelSchema })
const TagEntrySchema = z.object({ label: z.string().min(1), aiSuggested: z.boolean() })
const SubmitInput = z.object({
  valuesA: z.array(TagEntrySchema).min(1),
  needsA: z.array(TagEntrySchema).min(1),
  valuesB: z.array(TagEntrySchema).min(1),
  needsB: z.array(TagEntrySchema).min(1),
  // Only for a decision with a third option (2026-09-28 #2); required then.
  valuesC: z.array(TagEntrySchema).min(1).optional(),
  needsC: z.array(TagEntrySchema).min(1).optional(),
})
type TagEntry = z.infer<typeof TagEntrySchema>

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
      const optionContent = await ctx.crypto.decryptField<OptionContent>(option.content)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'values_needs_tags')
      const modelResult = await callPromptModel(version, {
        optionLabel,
        optionText: optionContent.content,
        languageInstruction: ctx.languageInstruction,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { values: [], needs: [] } : modelResult,
        promptRef: promptRef('decision_room', 'values_needs_tags', version),
      }
    }

    const { valuesA, needsA, valuesB, needsB, valuesC, needsC } = parseValue(ctx.input, SubmitInput)
    const withC = await hasOptionC(ctx.pk, ctx.sessionId)
    if (withC && (!valuesC || !needsC)) {
      throw new HttpError(400, 'tags_required', 'Option C needs at least one value and one need.')
    }
    const toTags = (optionLabel: DecisionOptionLabel, tagType: 'value' | 'need', entries: TagEntry[]) =>
      entries.map((t) => ({ optionLabel, tagType, label: t.label, aiSuggested: t.aiSuggested }))
    const newTags = [
      ...toTags('A', 'value', valuesA),
      ...toTags('A', 'need', needsA),
      ...toTags('B', 'value', valuesB),
      ...toTags('B', 'need', needsB),
      ...(withC && valuesC && needsC ? [...toTags('C', 'value', valuesC), ...toTags('C', 'need', needsC)] : []),
    ]
    await replaceTagsOfTypes(ctx.crypto, ctx.pk, ctx.sessionId, ['value', 'need'], newTags)

    // DecisionItem.currentStep does NOT advance here — matches the original:
    // `completeStep06` persists tags but current_step only becomes 7 once
    // the SectionSummaryScreen interstitial is dismissed
    // (VALUES_NEEDS_SUMMARY's own SUBMIT_STEP does that).
    return { nextStepId: 'VALUES_NEEDS_SUMMARY', result: {} }
  },
}
