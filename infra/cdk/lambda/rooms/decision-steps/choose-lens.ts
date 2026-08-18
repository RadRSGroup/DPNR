import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { DECISION_ROOM_STEP_NUMBER, LensSchema } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { ddb, TABLE_NAME } from './db'
import { getDecision } from './helpers'
import type { StepDefinition } from './types'

const SubmitInput = z.object({ lens: LensSchema })

/** No AI call in the original Step04 either — a single-select of 3 lens cards, nothing else. */
export const chooseLensStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const { lens } = parseValue(ctx.input, SubmitInput)
    const decision = await getDecision(ctx.pk, ctx.sessionId)
    const now = new Date().toISOString()
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...decision, lens, currentStep: DECISION_ROOM_STEP_NUMBER.DEEP_EXPLORATION, updatedAt: now },
      })
    )
    return { nextStepId: 'DEEP_EXPLORATION', result: { lens } }
  },
}
