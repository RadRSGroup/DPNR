import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  DECISION_ROOM_STEP_NUMBER,
  DecisionEmotionAgreementSchema,
  type DecisionEmotionAgreement,
  type DecisionEmotionItem,
  type EmotionFelt,
  type BodyPlacement,
} from '@dpnr/shared-types'
import { parseValue, HttpError } from '../../lib/http'
import { resolvePromptVersion, promptRef } from '../../lib/prompt-registry'
import { callPromptModel } from '../../lib/model-call'
import { FeltFields, normalizeFelt, formatEmotion, formatBody, type FeltInput } from '../felt'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { getDecision, type DecisionContent } from './helpers'
import type { StepDefinition } from './types'

// Slice 5b (Session 75): the step now captures emotions + body placements the
// Mirror Room way (chips → body map → optional own words, see ../felt). The
// legacy single-value shape (`bodyLocation` + one emotion) is still accepted so
// a client loaded before the deploy keeps working.
const RefineInput = z.object({ ...FeltFields, bodyLocation: z.string().optional() })
const SubmitInput = z.object({
  ...FeltFields,
  bodyLocation: z.string().optional(),
  emotionColor: z.string().optional(),
  // The AI reflection text being confirmed/refined. The server doesn't
  // retain REFINE's result between calls (each command is independently
  // persisted, matching the original app's client-side-state-until-commit
  // model) — the client echoes back what REFINE returned so SUBMIT_STEP
  // can persist the final text without a second model call.
  aiReflection: z.string().min(1),
  response: DecisionEmotionAgreementSchema,
  userRefinement: z.string().optional(),
})

/** Decrypted EMOTION item content. The optional fields are absent on pre-5b decisions. */
export type DecisionEmotionContent = {
  bodyLocation: string
  emotionColor: string
  aiReflection: string
  userResponse: DecisionEmotionAgreement
  emotionsFelt?: EmotionFelt[]
  bodyPlacements?: BodyPlacement[]
  emotionWords?: string
  bodyWords?: string
}

/**
 * Old clients send `bodyLocation` (+ `emotion`/`emotionColor`) and no chips;
 * treat those as the person's own words so the same validation applies.
 */
function readFelt(input: FeltInput & { bodyLocation?: string }, legacyEmotion?: string): FeltInput {
  const structured = !!input.emotionsFelt?.length || !!input.bodyPlacements?.length
  if (structured || !input.bodyLocation) return normalizeFelt(input)
  return normalizeFelt({ emotion: input.emotion || legacyEmotion || '', bodyResponse: input.bodyLocation })
}

/**
 * The legacy single values, still written so every reader of
 * `bodyLocation`/`emotionColor` keeps working: the first placement / first
 * chosen emotion, else the person's own words.
 */
export function legacyValues(felt: FeltInput): { bodyLocation: string; emotionColor: string } {
  return {
    bodyLocation: felt.bodyPlacements?.[0]?.area ?? felt.bodyResponse,
    emotionColor: felt.emotionsFelt?.[0]?.label ?? felt.emotion,
  }
}

export const bodyEmotionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      const input = parseValue(ctx.input, RefineInput)
      const legacy = !input.emotionsFelt?.length && !input.bodyPlacements?.length && !!input.bodyLocation
      const felt = readFelt(input)
      const decision = await getDecision(ctx.pk, ctx.sessionId)
      const content = await ctx.crypto.decryptField<DecisionContent>(decision.content)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'emotion_reflection')
      const modelResult = await callPromptModel(version, {
        title: content.title,
        narrativeExcerpt: content.narrative.slice(0, 600), // matches the seed's documented truncation convention
        // Same two template variables as before 5b, now carrying the formatted
        // chips/placements/words (like the Mirror reflection prompt), so the
        // prompt and the Lambda can be rolled out in either order.
        bodyLocation: legacy ? felt.bodyResponse : formatBody(felt),
        emotion: legacy ? felt.emotion : formatEmotion(felt),
        languageInstruction: ctx.languageInstruction,
      })
      return {
        nextStepId: null,
        result: typeof modelResult === 'string' ? { reflection: modelResult } : modelResult,
        promptRef: promptRef('decision_room', 'emotion_reflection', version),
      }
    }

    const input = parseValue(ctx.input, SubmitInput)
    const { aiReflection, response, userRefinement } = input
    const felt = readFelt(input, input.emotionColor)
    const { bodyLocation, emotionColor } = legacyValues(felt)
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
      content: await ctx.crypto.encryptField<DecisionEmotionContent>({
        bodyLocation,
        emotionColor,
        aiReflection: finalReflection,
        userResponse: response,
        emotionsFelt: felt.emotionsFelt,
        bodyPlacements: felt.bodyPlacements,
        emotionWords: felt.emotion || undefined,
        bodyWords: felt.bodyResponse || undefined,
      }),
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

    return {
      nextStepId: 'CHOOSE_LENS',
      result: {
        bodyLocation,
        emotionColor,
        reflection: finalReflection,
        response,
        emotionsFelt: felt.emotionsFelt,
        bodyPlacements: felt.bodyPlacements,
      },
    }
  },
}
