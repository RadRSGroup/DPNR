import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type MirrorSessionItem } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { ddb, TABLE_NAME } from '../db'
import type { MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({
  situation: z.string().min(1),
  trigger: z.string().min(1),
})

/**
 * First step — creates the Mirror Room session (analogous to Decision
 * Room's NAME_DECISION). No AI call: matches this session's design intent
 * of keeping the flow's first data-capture step unassisted, same as
 * Decision Room's own Step04 (Choose Your Lens) has none either. Every
 * field not yet captured is initialized to an empty string, filled in by
 * later steps as they submit — mirrors how NAME_DECISION seeds
 * DecisionItem.content with `narrative: ''` for MAP_OPTIONS to fill later.
 */
export const situationStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const { situation, trigger } = parseValue(ctx.input, SubmitInput)
    const now = new Date().toISOString()
    const content: MirrorContent = {
      situation,
      trigger,
      thought: '',
      emotion: '',
      bodyResponse: '',
      automaticReaction: '',
      copingResponse: '',
      recurringPattern: '',
      energyMoodEffect: '',
      lifeDomain: '',
      commitment: '',
    }
    const session: MirrorSessionItem = {
      pk: ctx.pk,
      sk: Sk.mirrorRoom(ctx.sessionId),
      mirrorId: ctx.sessionId,
      status: 'active',
      currentStepId: 'SITUATION',
      content: await ctx.crypto.encryptField<MirrorContent>(content),
      createdAt: now,
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: session }))
    return { nextStepId: 'AUTOMATIC_REACTION', result: { situation, trigger } }
  },
}
