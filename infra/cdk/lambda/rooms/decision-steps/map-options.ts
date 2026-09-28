import { z } from 'zod'
import { PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, type DecisionOptionItem, type DecisionOptionLabel, type DecisionTagItem, type DecisionProjectionItem } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { batchDeleteKeys } from '../../lib/batch-delete'
import type { SessionCrypto } from '../../lib/session-crypto'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, type DecisionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ narrative: z.string().min(1) })
const OptionInput = z.object({ content: z.string().min(1), approved: z.boolean() })
const SubmitInput = z.object({
  narrative: z.string().min(1),
  optionA: OptionInput,
  optionB: OptionInput,
  // Optional third option (2026-09-28 #2). Leaving it out on a resubmit
  // removes a C the decision had before, with everything recorded for it.
  optionC: OptionInput.optional(),
})

async function buildOptionItem(
  crypto: SessionCrypto,
  pk: string,
  decisionId: string,
  label: DecisionOptionLabel,
  content: string,
  now: string
): Promise<DecisionOptionItem> {
  return {
    pk,
    sk: Sk.decisionOption(decisionId, label),
    label,
    approved: true,
    content: await crypto.encryptField({ content }),
    createdAt: now,
  }
}

/** Deletes Option C and every tag/projection recorded for it (the person removed it in Step 2). */
async function removeOptionC(pk: string, decisionId: string): Promise<void> {
  const [tags, projections] = await Promise.all([
    ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#TAG#` },
    })),
    ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#PROJECTION#` },
    })),
  ])
  const keys = [
    ...((tags.Items ?? []) as DecisionTagItem[]).filter((t) => t.optionLabel === 'C'),
    ...((projections.Items ?? []) as DecisionProjectionItem[]).filter((p) => p.optionLabel === 'C'),
  ].map(({ pk: itemPk, sk }) => ({ pk: itemPk, sk }))
  await batchDeleteKeys(ddb, TABLE_NAME, keys)
  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionOption(decisionId, 'C') } }))
}

export const mapOptionsStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      // Mirrors "Find My Options" (Step02.tsx) — suggests options, does not
      // advance; the user still approves/edits them before SUBMIT_STEP. The
      // prompt returns optionC only when the story clearly names a third.
      const { narrative } = parseValue(ctx.input, RefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'parse_options')
      const modelResult = await callPromptModel(version, { narrative, languageInstruction: ctx.languageInstruction })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { optionA: modelResult, optionB: modelResult } : modelResult,
        promptRef: promptRef('decision_room', 'parse_options', version),
      }
    }

    const { narrative, optionA, optionB, optionC } = parseValue(ctx.input, SubmitInput)
    if (!optionA.approved || !optionB.approved || (optionC && !optionC.approved)) {
      // Matches the original canContinue() gate — every option must be approved.
      throw new HttpError(400, 'options_not_approved', 'Every option must be approved before continuing.')
    }

    const decisionItem = await getDecision(ctx.pk, ctx.sessionId)
    const existingContent = await ctx.crypto.decryptField<DecisionContent>(decisionItem.content)

    const now = new Date().toISOString()
    const updatedDecision = {
      ...decisionItem,
      currentStep: DECISION_ROOM_STEP_NUMBER.BODY_EMOTION,
      content: await ctx.crypto.encryptField<DecisionContent>({ ...existingContent, narrative }),
      updatedAt: now,
    }
    const optionItems = await Promise.all([
      buildOptionItem(ctx.crypto, ctx.pk, ctx.sessionId, 'A', optionA.content, now),
      buildOptionItem(ctx.crypto, ctx.pk, ctx.sessionId, 'B', optionB.content, now),
      ...(optionC ? [buildOptionItem(ctx.crypto, ctx.pk, ctx.sessionId, 'C', optionC.content, now)] : []),
    ])

    await Promise.all([
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedDecision })),
      ...optionItems.map((item) => ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))),
      ...(optionC ? [] : [removeOptionC(ctx.pk, ctx.sessionId)]),
    ])

    return {
      nextStepId: 'BODY_EMOTION',
      result: { narrative, optionA: optionA.content, optionB: optionB.content, ...(optionC ? { optionC: optionC.content } : {}) },
    }
  },
}
