import { z } from 'zod'
import { EncryptedBlobSchema } from './crypto'

/** USER#<id> / ROADMAP — current focus/theme/direction. Content is encrypted; nothing else here. */
export const RoadmapItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.roadmap() or Sk.roadmapVersion(n) for history
  content: EncryptedBlobSchema, // wraps { currentFocus, theme, direction, suggestedSpaces }
  updatedAt: z.string().datetime(),
})
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>

/**
 * Digital Twin signal model (spec §5 "Signal model" / "Trust rules").
 * domain/status/confidence/source stay plaintext — they're what the
 * confirm/reject UI and the pipeline's write-path logic need to operate
 * on without decrypting. Only the descriptive text of the signal itself
 * is personal content.
 */
export const TwinSignalDomainSchema = z.enum([
  'pattern',
  'trigger',
  'value',
  'current_focus',
  'direction',
  'commitment',
])
export type TwinSignalDomain = z.infer<typeof TwinSignalDomainSchema>

export const TwinSignalStatusSchema = z.enum(['candidate', 'confirmed', 'rejected'])
export type TwinSignalStatus = z.infer<typeof TwinSignalStatusSchema>

export const TwinSignalSourceSchema = z.enum([
  'mirror_room',
  'decision_room',
  'companion',
  'onboarding',
  'explicit_user_input',
])
export type TwinSignalSource = z.infer<typeof TwinSignalSourceSchema>

export const TwinSignalItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.twinSignal(domain, signalId)
  signalId: z.string(),
  domain: TwinSignalDomainSchema,
  status: TwinSignalStatusSchema,
  confidence: z.number().min(0).max(1),
  source: TwinSignalSourceSchema,
  sourceSessionId: z.string().optional(),
  content: EncryptedBlobSchema, // wraps { description: string }
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type TwinSignalItem = z.infer<typeof TwinSignalItemSchema>
