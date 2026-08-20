import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, type DecisionItem } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { stubEncryptField } from '../../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import type { DecisionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ title: z.string().min(1) })
const SubmitInput = z.object({ title: z.string().min(1), subtitle: z.string().optional() })

export const nameDecisionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      // Mirrors the original "Suggest a frame" button (Step01.tsx) — an
      // AI assist that does NOT advance the step. The decision doesn't
      // exist in DB yet at this point, so `title` must come from the
      // client, not a read.
      const { title } = parseValue(ctx.input, RefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'subtitle')
      const modelResult = await callPromptModel(version, { title })
      return {
        nextStepId: null,
        result: { subtitle: modelResult },
        promptRef: promptRef('decision_room', 'subtitle', version),
      }
    }

    const { title, subtitle } = parseValue(ctx.input, SubmitInput)
    const now = new Date().toISOString()
    const decision: DecisionItem = {
      pk: ctx.pk,
      sk: Sk.decisionRoom(ctx.sessionId),
      decisionId: ctx.sessionId,
      status: 'active',
      currentStep: DECISION_ROOM_STEP_NUMBER.MAP_OPTIONS, // matches original: completing step 1 sets current_step to 2
      lens: null,
      reviewDate: null,
      content: stubEncryptField<DecisionContent>({ title, subtitle: subtitle ?? null, narrative: '' }),
      createdAt: now,
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: decision }))
    return { nextStepId: 'MAP_OPTIONS', result: { title, subtitle: subtitle ?? null } }
  },
}
