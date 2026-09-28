import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { DECISION_ROOM_STEP_NUMBER, LensSchema, type Lens } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { ddb, TABLE_NAME } from './db'
import { getDecision } from './helpers'
import type { StepDefinition } from './types'

/**
 * Either explore a lens, or move on to Future Projection (`continue`).
 * The person can return here after each lens and pick another, in any
 * order, or revisit one (founder feedback 2026-09-28 #6/#7, user-approved).
 */
const SubmitInput = z.union([z.object({ lens: LensSchema }), z.object({ continue: z.literal(true) })])

/** Where each lens is explored. Values & Needs has its own step; the other two share Step05's tagging. */
export function stepForLens(lens: Lens): 'DEEP_EXPLORATION' | 'VALUES_NEEDS' {
  return lens === 'values_needs' ? 'VALUES_NEEDS' : 'DEEP_EXPLORATION'
}

/**
 * No AI call. Before 2026-09-28 the person picked ONE lens here and the flow
 * then ran that lens (Step05) plus Values & Needs (Step06) unconditionally.
 * Now each lens routes to its own exploration and its summary comes back
 * here (see section-summary.ts), and `continue` leads to Future Projection.
 * An older client only ever sends `{ lens }`, which still works: the
 * summary returns it here, where it can pick again (it has no `continue`,
 * but its local Skip still reaches Future Projection).
 */
export const chooseLensStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const input = parseValue(ctx.input, SubmitInput)
    const decision = await getDecision(ctx.pk, ctx.sessionId)
    const now = new Date().toISOString()

    if ('continue' in input) {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: { ...decision, currentStep: DECISION_ROOM_STEP_NUMBER.FUTURE_PROJECTION, updatedAt: now },
        })
      )
      return { nextStepId: 'FUTURE_PROJECTION', result: { completedLenses: decision.completedLenses ?? [] } }
    }

    const nextStepId = stepForLens(input.lens)
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...decision, lens: input.lens, currentStep: DECISION_ROOM_STEP_NUMBER[nextStepId], updatedAt: now },
      })
    )
    return { nextStepId, result: { lens: input.lens } }
  },
}
