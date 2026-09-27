import { z } from 'zod'
import { EmotionFeltSchema, BodyPlacementSchema, type EmotionFelt, type BodyPlacement } from '@dpnr/shared-types'
import { HttpError } from '../lib/http'

/**
 * Emotion + body capture shared by the Mirror Room (AUTOMATIC_REACTION, #35)
 * and the Decision Room (BODY_EMOTION, Slice 5b). Each half needs the chips /
 * body map, or the person's own words, or both; the structured parts are
 * optional so older clients still work.
 */
export const FeltFields = {
  emotion: z.string().default(''),
  bodyResponse: z.string().default(''),
  emotionsFelt: z.array(EmotionFeltSchema).max(12).optional(),
  bodyPlacements: z.array(BodyPlacementSchema).max(108).optional(),
}

export type FeltInput = { emotion: string; bodyResponse: string; emotionsFelt?: EmotionFelt[]; bodyPlacements?: BodyPlacement[] }

/** Both halves must be answered somehow, and every placement must use an emotion the person chose. */
export function normalizeFelt(input: FeltInput): FeltInput {
  const emotionsFelt = input.emotionsFelt?.length ? input.emotionsFelt : undefined
  const chosen = new Set((emotionsFelt ?? []).map((e) => e.label))
  const seen = new Set<string>()
  const bodyPlacements = (input.bodyPlacements ?? []).filter((p) => {
    const key = `${p.emotion}|${p.area}`
    if (!chosen.has(p.emotion) || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const emotion = input.emotion.trim()
  const bodyResponse = input.bodyResponse.trim()
  if (!emotion && !emotionsFelt) {
    throw new HttpError(400, 'emotion_required', 'Choose at least one emotion or describe what you felt.')
  }
  if (!bodyResponse && bodyPlacements.length === 0) {
    throw new HttpError(400, 'body_required', 'Place a feeling on the body or describe where you felt it.')
  }
  return { emotion, bodyResponse, emotionsFelt, bodyPlacements: bodyPlacements.length ? bodyPlacements : undefined }
}

/** Emotion for the prompts: the chips they chose plus their own words, whichever exist. */
export function formatEmotion(content: { emotion: string; emotionsFelt?: EmotionFelt[] }): string {
  const parts: string[] = []
  if (content.emotionsFelt?.length) parts.push(`chose ${content.emotionsFelt.map((e) => e.label).join(', ')}`)
  if (content.emotion.trim()) parts.push(`in their words: "${content.emotion.trim()}"`)
  return parts.join('; ') || 'not said'
}

/** Body for the prompts: where THEY placed each emotion, plus their own words. Never inferred. */
export function formatBody(content: { bodyResponse: string; bodyPlacements?: BodyPlacement[] }): string {
  const parts: string[] = []
  if (content.bodyPlacements?.length) {
    const byEmotion = new Map<string, string[]>()
    for (const p of content.bodyPlacements) byEmotion.set(p.emotion, [...(byEmotion.get(p.emotion) ?? []), p.area])
    parts.push(`placed on the body map: ${[...byEmotion].map(([emotion, areas]) => `${emotion} in ${areas.join(', ')}`).join('; ')}`)
  }
  if (content.bodyResponse.trim()) parts.push(`in their words: "${content.bodyResponse.trim()}"`)
  return parts.join('; ') || 'not said'
}
