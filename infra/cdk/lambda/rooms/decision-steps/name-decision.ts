import { z } from 'zod'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, type DecisionItem } from '@dpnr/shared-types'
import { parseValue } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import type { DecisionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ title: z.string().min(1) })
const SubmitInput = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  // Intelligence Spec §18/Appendix B — see mirror-steps/situation.ts's
  // identical field for provenance.
  sourceLibraryTopic: z.string().optional(),
})

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
      const modelResult = await callPromptModel(version, { title, languageInstruction: ctx.languageInstruction })
      return {
        nextStepId: null,
        result: { subtitle: modelResult },
        promptRef: promptRef('decision_room', 'subtitle', version),
      }
    }

    const { title, subtitle, sourceLibraryTopic } = parseValue(ctx.input, SubmitInput)
    const now = new Date().toISOString()
    // A resubmit (Back, or redo after REOPEN) keeps the existing decision's
    // narrative, lens, review date and creation date — later steps overwrite
    // their own parts as the person moves forward again.
    const existingResult = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: ctx.pk, sk: Sk.decisionRoom(ctx.sessionId) } })
    )
    const existing = existingResult.Item as DecisionItem | undefined
    const existingContent = existing ? await ctx.crypto.decryptField<DecisionContent>(existing.content) : null
    const decision: DecisionItem = {
      pk: ctx.pk,
      sk: Sk.decisionRoom(ctx.sessionId),
      decisionId: ctx.sessionId,
      status: 'active',
      currentStep: DECISION_ROOM_STEP_NUMBER.MAP_OPTIONS, // matches original: completing step 1 sets current_step to 2
      lens: existing?.lens ?? null,
      reviewDate: existing?.reviewDate ?? null,
      content: await ctx.crypto.encryptField<DecisionContent>({
        title,
        subtitle: subtitle ?? null,
        narrative: existingContent?.narrative ?? '',
      }),
      sourceLibraryTopic: sourceLibraryTopic ?? existing?.sourceLibraryTopic,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: decision }))
    return { nextStepId: 'MAP_OPTIONS', result: { title, subtitle: subtitle ?? null } }
  },
}
