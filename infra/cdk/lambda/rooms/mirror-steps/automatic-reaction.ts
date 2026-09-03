import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const RefineInput = z.object({
  thought: z.string().min(1),
  emotion: z.string().min(1),
  bodyResponse: z.string().min(1),
})
const SubmitInput = z.object({
  thought: z.string().min(1),
  emotion: z.string().min(1),
  bodyResponse: z.string().min(1),
  automaticReaction: z.string().min(1),
})

/**
 * The in-the-moment cluster: automatic thought, emotion, body sensation,
 * and what they actually did/said. `REFINE` generates a `reflection`
 * (ephemeral, mirroring `decision_room/emotion_reflection`'s pattern — no
 * schema field exists to persist an AI reflection here, same as Decision
 * Room's own emotion step doesn't persist the raw AI text separately from
 * the user's final choice). `SITUATION`'s already-persisted content
 * (`situation`, `trigger`) is read from DB, not resupplied by the client.
 */
export const automaticReactionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = await ctx.crypto.decryptField<MirrorContent>(session.content)

    if (ctx.action === 'REFINE') {
      const { thought, emotion, bodyResponse } = parseValue(ctx.input, RefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'mirror_room', 'reflection')
      const modelResult = await callPromptModel(version, {
        situationExcerpt: content.situation.slice(0, 600),
        trigger: content.trigger,
        thought,
        emotion,
        bodyResponse,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { reflection: modelResult } : modelResult,
        promptRef: promptRef('mirror_room', 'reflection', version),
      }
    }

    const { thought, emotion, bodyResponse, automaticReaction } = parseValue(ctx.input, SubmitInput)
    const now = new Date().toISOString()
    const updatedSession = {
      ...session,
      currentStepId: 'AUTOMATIC_REACTION',
      content: await ctx.crypto.encryptField<MirrorContent>({ ...content, thought, emotion, bodyResponse, automaticReaction }),
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))
    return { nextStepId: 'PATTERN', result: { thought, emotion, bodyResponse, automaticReaction } }
  },
}
