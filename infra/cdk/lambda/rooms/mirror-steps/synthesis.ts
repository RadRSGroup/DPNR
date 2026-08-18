import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

/**
 * Closing step — a synthesis/restatement of the whole session, added at
 * the user's explicit request for UX consistency with Decision Room's own
 * closing sequence. `REFINE` generates it (nothing new to persist — same
 * pattern as Decision Room's `SESSION_SUMMARY`); `SUBMIT_STEP` marks the
 * whole Mirror Room session complete. Unlike Decision Room, there's no
 * earlier point where `MirrorSessionItem.status` becomes `'completed'` —
 * this step is the only one that sets it, and it's also the true end of
 * the flow (no further post-flow sequence is defined for Mirror Room
 * anywhere — inventing one would be scope creep beyond this session's
 * "reasonable first pass" mandate).
 */
export const synthesisStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = stubDecryptField<MirrorContent>(session.content)

    if (ctx.action === 'REFINE') {
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'mirror_room', 'synthesis')
      const stub = await callPromptModelStub(version, {
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
        result: typeof stub === 'string' ? { synthesis: stub } : stub,
        promptRef: promptRef('mirror_room', 'synthesis', version),
      }
    }

    const now = new Date().toISOString()
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { ...session, status: 'completed' as const, updatedAt: now } }))
    return { nextStepId: null, result: {}, sessionComplete: true }
  },
}
