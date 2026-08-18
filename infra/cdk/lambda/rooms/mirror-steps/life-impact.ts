import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({
  energyMoodEffect: z.string().min(1),
  lifeDomain: z.string().min(1),
})

/**
 * Last data-capture step — how this affected their energy/mood, and which
 * life domain it touches ("shape the character" in the architecture doc's
 * phrase). Does NOT end the session — SYNTHESIS is the closing step.
 */
export const lifeImpactStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const { energyMoodEffect, lifeDomain } = parseValue(ctx.input, SubmitInput)
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = stubDecryptField<MirrorContent>(session.content)
    const now = new Date().toISOString()
    const updatedSession = {
      ...session,
      currentStepId: 'LIFE_IMPACT',
      content: stubEncryptField<MirrorContent>({ ...content, energyMoodEffect, lifeDomain }),
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))
    return { nextStepId: 'SYNTHESIS', result: { energyMoodEffect, lifeDomain } }
  },
}
