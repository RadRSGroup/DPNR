import { z } from 'zod'
import type { Lens, TagType } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, getOption, replaceTagsOfTypes, type DecisionContent, type OptionContent, type TagEntry } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ optionLabel: z.enum(['A', 'B']) })
const TagEntrySchema = z.object({ label: z.string().min(1), aiSuggested: z.boolean() })
const TagBucketSchema = z.object({
  pro: z.array(TagEntrySchema).optional(),
  con: z.array(TagEntrySchema).optional(),
  desire: z.array(TagEntrySchema).optional(),
  fear: z.array(TagEntrySchema).optional(),
})
const SubmitInput = z.object({ tagsA: TagBucketSchema, tagsB: TagBucketSchema })
type TagBucket = z.infer<typeof TagBucketSchema>

/**
 * Lens branching — decided this session, see docs/AGENT_LOG.md for the
 * full writeup. The original app's Step05 gave `pros_cons` its own
 * AI-suggested Pros/Cons section, but `fears_desires` AND `values_needs`
 * both fell into the identical Desires/Fears section (a working, clearly
 * intentional ternary — not itself ambiguous). The actual gap: the
 * AI-suggestion fetch was an `if (pros_cons) … else if (fears_desires) …`
 * chain that never matched `values_needs`, so that lens alone got the
 * section with zero AI help.
 *
 * Decision: preserve the section choice exactly, but complete the
 * apparent oversight by firing the same `fear_desire_tags` suggestion for
 * `values_needs` too, rather than perpetuate an asymmetry with no product
 * rationale behind it. Step06 (Values & Needs) is unchanged either way —
 * it still runs unconditionally for every lens, exactly as the original.
 */
export function tagKindForLens(lens: Lens): 'pros_cons' | 'fears_desires' {
  return lens === 'pros_cons' ? 'pros_cons' : 'fears_desires'
}

function flattenTags(
  optionLabel: 'A' | 'B',
  tags: TagBucket
): { optionLabel: 'A' | 'B'; tagType: TagType; label: string; aiSuggested: boolean }[] {
  const out: { optionLabel: 'A' | 'B'; tagType: TagType; label: string; aiSuggested: boolean }[] = []
  for (const tagType of ['pro', 'con', 'desire', 'fear'] as const) {
    for (const t of tags[tagType] ?? []) {
      out.push({ optionLabel, tagType, label: t.label, aiSuggested: t.aiSuggested })
    }
  }
  return out
}

export const deepExplorationStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    const decision = await getDecision(ctx.pk, ctx.sessionId)
    if (!decision.lens) {
      throw new HttpError(400, 'lens_not_chosen', 'CHOOSE_LENS must be submitted before DEEP_EXPLORATION.')
    }
    const kind = tagKindForLens(decision.lens)

    if (ctx.action === 'REFINE') {
      const { optionLabel } = parseValue(ctx.input, RefineInput)
      const option = await getOption(ctx.pk, ctx.sessionId, optionLabel)
      const decisionContent = await ctx.crypto.decryptField<DecisionContent>(decision.content)
      const optionContent = await ctx.crypto.decryptField<OptionContent>(option.content)

      if (kind === 'pros_cons') {
        const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'pros_cons_tags')
        const modelResult = await callPromptModel(version, {
          optionLabel,
          optionText: optionContent.content,
          narrativeExcerpt: decisionContent.narrative.slice(0, 400), // matches the seed's documented truncation
        })
        return {
          nextStepId: null,
          result: typeof modelResult === 'string' ? { pros: [], cons: [] } : modelResult,
          promptRef: promptRef('decision_room', 'pros_cons_tags', version),
        }
      }

      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'fear_desire_tags')
      const modelResult = await callPromptModel(version, { narrativeExcerpt: decisionContent.narrative.slice(0, 600) })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { desires: [], fears: [] } : modelResult,
        promptRef: promptRef('decision_room', 'fear_desire_tags', version),
      }
    }

    const { tagsA, tagsB } = parseValue(ctx.input, SubmitInput)
    const requiredKeys: ('pro' | 'con' | 'desire' | 'fear')[] = kind === 'pros_cons' ? ['pro', 'con'] : ['desire', 'fear']
    for (const [label, tags] of [
      ['A', tagsA],
      ['B', tagsB],
    ] as const) {
      for (const key of requiredKeys) {
        if (!tags[key] || (tags[key] as TagEntry[]).length === 0) {
          throw new HttpError(400, 'tags_required', `Option ${label} needs at least one "${key}" tag for the ${kind} lens.`)
        }
      }
    }

    const newTags = [...flattenTags('A', tagsA), ...flattenTags('B', tagsB)]
    await replaceTagsOfTypes(ctx.crypto, ctx.pk, ctx.sessionId, ['pro', 'con', 'desire', 'fear'], newTags)

    // DecisionItem.currentStep does NOT advance here — matches the original
    // exactly: `completeStep05` persists tags but current_step only becomes
    // 6 once the SectionSummaryScreen interstitial is dismissed
    // (DEEP_EXPLORATION_SUMMARY's own SUBMIT_STEP does that). A resuming
    // client should see currentStep still at 5 if they never got past that
    // interstitial, same as the original.
    return { nextStepId: 'DEEP_EXPLORATION_SUMMARY', result: {} }
  },
}
