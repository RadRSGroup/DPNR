import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from '../db'
import {
  getMirrorSession, withAnswers, depthPatch, formatEntryContext, formatEmotion, formatBody, formatDepthContext,
  type MirrorContent,
} from './helpers'
import type { StepDefinition } from '../types'

const DEPTH_KEYS = ['payoff', 'deeperBelief', 'origin'] as const
// Every field optional: the page's plain "Continue" (and older clients) send {}.
const RefineInput = z.object({
  payoff: z.string().max(5000).optional(),
  deeperBelief: z.string().max(5000).optional(),
  origin: z.string().max(5000).optional(),
})

/**
 * A synthesis/restatement of the whole session so far, added at the
 * user's explicit request for UX consistency with Decision Room's own
 * closing sequence. `REFINE` generates it; `SUBMIT_STEP` persists nothing
 * new and advances to `COMMITMENT` — the real end of the flow (a
 * reflective screen isn't the same fact as "the flow is done").
 *
 * Session 72 (founder feedback, user-approved): unlike other REFINEs, this
 * one saves its text (encrypted, `content.synthesis`), because it is the
 * session's closing picture: leaving on this screen and resuming used to
 * blank it and charge for a new one. It's server-generated text written
 * server-side, never client-supplied. `withAnswers` drops it whenever an
 * earlier answer changes, so a stale synthesis can't outlive its inputs.
 */
export const synthesisStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const storedContent = await ctx.crypto.decryptField<MirrorContent>(session.content)

    if (ctx.action === 'REFINE') {
      // Mirror depth slice 2: the optional answers from the moment after
      // Step 4 ride on this REFINE (no extra paid call). Merged first, so a
      // changed answer can't leave an old synthesis in place.
      const patch = depthPatch(parseValue(ctx.input, RefineInput), DEPTH_KEYS)
      const content = withAnswers(storedContent, patch)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'mirror_room', 'synthesis')
      const modelResult = await callPromptModel(version, {
        situationExcerpt: content.situation.slice(0, 600),
        trigger: content.trigger,
        thought: content.thought,
        emotion: formatEmotion(content),
        bodyResponse: formatBody(content),
        automaticReaction: content.automaticReaction,
        copingResponse: content.copingResponse,
        recurringPattern: content.recurringPattern,
        energyMoodEffect: content.energyMoodEffect,
        lifeDomain: content.lifeDomain,
        entryContext: formatEntryContext(content.entry),
        depthContext: formatDepthContext(content),
        languageInstruction: ctx.languageInstruction,
      })
      const result = typeof modelResult === 'string' ? { synthesis: modelResult } : modelResult
      const synthesis = typeof (result as { synthesis?: unknown }).synthesis === 'string' ? (result as { synthesis: string }).synthesis : ''
      // The depth answers are saved with the synthesis; with no synthesis
      // (empty model output) they're still saved rather than dropped.
      if (synthesis || Object.keys(patch).length > 0) {
        await ddb.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...session,
            content: await ctx.crypto.encryptField<MirrorContent>(synthesis ? { ...content, synthesis } : content),
            updatedAt: new Date().toISOString(),
          },
        }))
      }
      return {
        nextStepId: null,
        result,
        promptRef: promptRef('mirror_room', 'synthesis', version),
      }
    }

    const now = new Date().toISOString()
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: { ...session, currentStepId: 'SYNTHESIS', updatedAt: now } }))
    return { nextStepId: 'COMMITMENT', result: {} }
  },
}
