import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({
  copingResponse: z.string().min(1),
  recurringPattern: z.string().min(1),
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
    const { copingResponse, recurringPattern } = parseValue(ctx.input, SubmitInput)
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = stubDecryptField<MirrorContent>(session.content)
    const now = new Date().toISOString()
    const updatedSession = {
      ...session,
      content: stubEncryptField<MirrorContent>({ ...content, copingResponse, recurringPattern }),
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))
    return { nextStepId: 'LIFE_IMPACT', result: { copingResponse, recurringPattern } }
  },
}
