import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

/**
 * A synthesis/restatement of the whole session so far, added at the
 * user's explicit request for UX consistency with Decision Room's own
 * closing sequence. `REFINE` generates it (nothing new to persist — same
 * pattern as Decision Room's `SESSION_SUMMARY`); `SUBMIT_STEP` persists
 * nothing and advances to `COMMITMENT` — added in Session 6 per explicit
 * product request, the real end of the flow (mirrors Decision Room's own
 * `SESSION_SUMMARY` → ... → `COMMITMENT` split: a reflective screen isn't
 * the same fact as "the flow is done").
 */
export const synthesisStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = stubDecryptField<MirrorContent>(session.content)

    if (ctx.action === 'REFINE') {
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'mirror_room', 'synthesis')
      const modelResult = await callPromptModel(version, {
        situationExcerpt: content.situation.slice(0, 600),
        trigger: content.trigger,
        thought: content.thought,
        emotion: content.emotion,
        bodyResponse: content.bodyResponse,
        automaticReaction: content.automaticReaction,
        copingResponse: content.copingResponse,
        recurringPattern: content.recurringPattern,
        energyMoodEffect: content.energyMoodEffect,
        lifeDomain: content.lifeDomain,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { synthesis: modelResult } : modelResult,
        promptRef: promptRef('mirror_room', 'synthesis', version),
      }
    }

    const now = new Date().toISOString()
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { ...session, currentStepId: 'SYNTHESIS', updatedAt: now } }))
    return { nextStepId: 'COMMITMENT', result: {} }
  },
}
