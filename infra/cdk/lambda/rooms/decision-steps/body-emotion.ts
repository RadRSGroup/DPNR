import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, DECISION_ROOM_STEP_NUMBER, DecisionEmotionAgreementSchema, type DecisionEmotionItem } from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, type DecisionContent } from './helpers'
import type { StepDefinition } from './types'

const RefineInput = z.object({ bodyLocation: z.string().min(1), emotion: z.string().min(1) })
const SubmitInput = z.object({
  bodyLocation: z.string().min(1),
  emotionColor: z.string().min(1),
  // The AI reflection text being confirmed/refined. The server doesn't
  // retain REFINE's result between calls (each command is independently
  // persisted, matching the original app's client-side-state-until-commit
  // model) — the client echoes back what REFINE returned so SUBMIT_STEP
  // can persist the final text without a second model call.
  aiReflection: z.string().min(1),
  response: DecisionEmotionAgreementSchema,
  userRefinement: z.string().optional(),
})

export const bodyEmotionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const { bodyLocation, emotion } = parseValue(ctx.input, RefineInput)
      const decision = await getDecision(ctx.pk, ctx.sessionId)
      const content = await ctx.crypto.decryptField<DecisionContent>(decision.content)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'emotion_reflection')
      const modelResult = await callPromptModel(version, {
        title: content.title,
        narrativeExcerpt: content.narrative.slice(0, 600), // matches the seed's documented truncation convention
        bodyLocation,
        emotion,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { reflection: modelResult } : modelResult,
        promptRef: promptRef('decision_room', 'emotion_reflection', version),
      }
    }

    const { bodyLocation, emotionColor, aiReflection, response, userRefinement } = parseValue(ctx.input, SubmitInput)
    if (response === 'refine' && !userRefinement?.trim()) {
      // Matches the original gate: Continue requires userRefinement when response is "refine".
      throw new HttpError(400, 'refinement_required', 'userRefinement is required when response is "refine".')
    }
    const finalReflection = response === 'refine' && userRefinement?.trim() ? userRefinement : aiReflection

    const decision = await getDecision(ctx.pk, ctx.sessionId)
    const now = new Date().toISOString()
    const emotionItem: DecisionEmotionItem = {
      pk: ctx.pk,
      sk: Sk.decisionEmotion(ctx.sessionId),
      content: await ctx.crypto.encryptField({ bodyLocation, emotionColor, aiReflection: finalReflection, userResponse: response }),
      createdAt: now,
    }

    await Promise.all([
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: emotionItem })),
      ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: { ...decision, currentStep: DECISION_ROOM_STEP_NUMBER.CHOOSE_LENS, updatedAt: now },
        })
      ),
    ])

    return { nextStepId: 'CHOOSE_LENS', result: { bodyLocation, emotionColor, reflection: finalReflection, response } }
  },
}
