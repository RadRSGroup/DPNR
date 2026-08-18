import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, type DecisionOptionItem } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModelStub } from '../../lib/model-call-stub'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, type DecisionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ narrative: z.string().min(1) })
const OptionInput = z.object({ content: z.string().min(1), approved: z.boolean() })
const SubmitInput = z.object({
  narrative: z.string().min(1),
  optionA: OptionInput,
  optionB: OptionInput,
})

export const mapOptionsStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      // Mirrors "Find My Options" (Step02.tsx) — suggests options, does not
      // advance; the user still approves/edits both before SUBMIT_STEP.
      const { narrative } = parseValue(ctx.input, RefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'parse_options')
      const stub = await callPromptModelStub(version, { narrative })
      return {
        nextStepId: null,
        result: typeof stub === 'string' ? { optionA: stub, optionB: stub } : stub,
        promptRef: promptRef('decision_room', 'parse_options', version),
      }
    }

    const { narrative, optionA, optionB } = parseValue(ctx.input, SubmitInput)
    if (!optionA.approved || !optionB.approved) {
      // Matches the original canContinue() gate — both options must be approved.
      throw new HttpError(400, 'options_not_approved', 'Both options must be approved before continuing.')
    }

    const decisionItem = await getDecision(ctx.pk, ctx.sessionId)
    const existingContent = stubDecryptField<DecisionContent>(decisionItem.content)

    const now = new Date().toISOString()
    const updatedDecision = {
      ...decisionItem,
      currentStep: DECISION_ROOM_STEP_NUMBER.BODY_EMOTION,
      content: stubEncryptField<DecisionContent>({ ...existingContent, narrative }),
      updatedAt: now,
    }
    const optionAItem: DecisionOptionItem = {
      pk: ctx.pk,
      sk: Sk.decisionOption(ctx.sessionId, 'A'),
      label: 'A',
      approved: true,
      content: stubEncryptField({ content: optionA.content }),
      createdAt: now,
    }
    const optionBItem: DecisionOptionItem = {
      pk: ctx.pk,
      sk: Sk.decisionOption(ctx.sessionId, 'B'),
      label: 'B',
      approved: true,
      content: stubEncryptField({ content: optionB.content }),
      createdAt: now,
    }

    await Promise.all([
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedDecision })),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: optionAItem })),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: optionBItem })),
    ])

    return { nextStepId: 'BODY_EMOTION', result: { narrative, optionA: optionA.content, optionB: optionB.content } }
  },
}
