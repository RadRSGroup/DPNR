import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { gatherDecisionContext } from './decision-context'
import type { StepDefinition } from './types'

/**
 * Post-flow "step 8" in the original (`STEP_LABELS` — not part of the 1–7
 * structural model). No SUBMIT_STEP input: the original's "agreement"
 * selection on this screen is UI-only, never persisted or read downstream
 * (flagged during the Session 5 step mapping) — this step exists purely to
 * generate content and advance, matching that exactly.
 *
 * `narrative` is passed to the prompt UNTRUNCATED here, unlike most other
 * decision_room prompts (emotion_reflection/pros_cons_tags/fear_desire_tags
 * all truncate) — that's the original's actual behavior for
 * `session_summary` specifically (see decision-room-prompts.seed.ts), not
 * an inconsistency introduced here. Also note: only `desiresA`/`fearsA`
 * exist in this prompt's template, with no B equivalents — the original
 * prompt itself never had them, preserved faithfully rather than "fixed."
 */
export const sessionSummaryStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const context = await gatherDecisionContext(ctx.crypto, ctx.pk, ctx.sessionId)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'session_summary')
      const modelResult = await callPromptModel(version, {
        decisionTitle: context.title,
        narrative: context.narrative,
        optionA: context.optionAContent,
        optionB: context.optionBContent,
        emotionColor: context.emotionColor ?? '—',
        emotionBodyLocation: context.emotionBodyLocation ?? '—',
        emotionReflection: context.emotionReflection ?? '',
        prosA: context.tagsA.pro.join(', ') || '—',
        consA: context.tagsA.con.join(', ') || '—',
        prosB: context.tagsB.pro.join(', ') || '—',
        consB: context.tagsB.con.join(', ') || '—',
        desiresA: context.tagsA.desire.join(', ') || '—',
        fearsA: context.tagsA.fear.join(', ') || '—',
        valuesA: context.tagsA.value.join(', ') || '—',
        needsA: context.tagsA.need.join(', ') || '—',
        valuesB: context.tagsB.value.join(', ') || '—',
        needsB: context.tagsB.need.join(', ') || '—',
        projectionsA: context.projectionsA.join(', ') || '—',
        projectionsB: context.projectionsB.join(', ') || '—',
        chosenLean: context.chosenLean,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { situation: modelResult } : modelResult,
        promptRef: promptRef('decision_room', 'session_summary', version),
      }
    }

    // SUBMIT_STEP: nothing to persist — matches the original (no DB write on this screen).
    return { nextStepId: 'SUMMARY_INSIGHT', result: {} }
  },
}
