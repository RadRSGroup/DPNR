import { z } from 'zod'

/**
 * Emotion + body capture, shared by the Mirror Room (#35, Session 72) and the
 * Decision Room (Slice 5b, Session 75). The person picks emotions (the
 * EMOTION_COLORS palette) and places each one on the body themselves — DPNR
 * never picks or suggests a location (Appendix B). Descriptive only: nothing
 * here is scored.
 */
export const BodyAreaSchema = z.enum(['Head', 'Throat', 'Shoulders', 'Chest', 'Arms', 'Hands', 'Stomach', 'Gut', 'Legs'])
export type BodyArea = z.infer<typeof BodyAreaSchema>
export const EmotionFeltSchema = z.object({
  label: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
export type EmotionFelt = z.infer<typeof EmotionFeltSchema>
export const BodyPlacementSchema = z.object({
  area: BodyAreaSchema,
  emotion: z.string().min(1).max(40),
})
export type BodyPlacement = z.infer<typeof BodyPlacementSchema>
