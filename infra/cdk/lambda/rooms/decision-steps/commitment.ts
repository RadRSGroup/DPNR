import { z } from 'zod'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { DecisionOutcomeItem } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from './db'
import type { StepDefinition } from './types'

const SubmitInput = z.object({ commitment: z.string().optional() })

/**
 * The real end of the whole Decision Room flow — matches the original's
 * `finishFlow`. No AI call (CommitmentScreen has none in the original).
 * `commitment` is genuinely optional: the original only appends
 * `Commitment: ...` onto the existing outcome row "if commitment.trim()"
 * — an empty/skipped commitment still finishes the flow, it just skips
 * the append. CelebrationScreen/CompletionScreen after this are pure
 * client-side transitions with no backend interaction (no AI, no
 * persistence) — not modeled as steps here.
 */
export const commitmentStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const { commitment } = parseValue(ctx.input, SubmitInput)

    if (commitment?.trim()) {
      const outcomesResult = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': ctx.pk, ':prefix': `ROOM#DECISION#${ctx.sessionId}#OUTCOME#` },
          ScanIndexForward: false, // most recent first
          Limit: 1,
        })
      )
      const latestOutcome = (outcomesResult.Items ?? [])[0] as DecisionOutcomeItem | undefined
      if (!latestOutcome) {
        throw new HttpError(404, 'outcome_not_found', 'No outcome exists yet — submit FUTURE_PROJECTION first.')
      }
      const existingReflection = stubDecryptField<{ reflection: string }>(latestOutcome.content).reflection
      const updatedOutcome: DecisionOutcomeItem = {
        ...latestOutcome,
        content: stubEncryptField({ reflection: `${existingReflection} Commitment: ${commitment}` }),
      }
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedOutcome }))
    }

    return { nextStepId: null, result: { commitment: commitment ?? null }, sessionComplete: true }
  },
}
