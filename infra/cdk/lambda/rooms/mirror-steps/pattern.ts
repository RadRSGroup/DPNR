import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { ddb, TABLE_NAME } from '../db'
import { getMirrorSession, withAnswers, depthPatch, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({
  copingResponse: z.string().min(1),
  recurringPattern: z.string().min(1),
  // Mirror depth slice 2: the optional answer from the moment after Step 2,
  // which shows once the backend is already on PATTERN (see helpers.ts).
  emotionUnderneath: z.string().max(5000).optional(),
})

/**
 * Widens from the specific incident to a broader pattern: how they coped
 * afterward (distinct from AUTOMATIC_REACTION's in-the-moment behavior),
 * and whether this recurs with certain people/situations. No AI
 * touchpoint — this session's first-pass design keeps to one reflection
 * moment, right after the emotionally-loaded AUTOMATIC_REACTION step.
 */
export const patternStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const input = parseValue(ctx.input, SubmitInput)
    const { copingResponse, recurringPattern } = input
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = await ctx.crypto.decryptField<MirrorContent>(session.content)
    const now = new Date().toISOString()
    const answers = { copingResponse, recurringPattern, ...depthPatch(input, ['emotionUnderneath'] as const) }
    const updatedSession = {
      ...session,
      currentStepId: 'PATTERN',
      content: await ctx.crypto.encryptField<MirrorContent>(withAnswers(content, answers)),
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))
    return { nextStepId: 'LIFE_IMPACT', result: { copingResponse, recurringPattern } }
  },
}
