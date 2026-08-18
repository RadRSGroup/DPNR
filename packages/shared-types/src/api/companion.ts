import { z } from 'zod'

/**
 * Companion — chat-first router (MVP_ARCHITECTURE.md §5.1). A Bedrock
 * Converse loop with a small tool-routing layer: the response is either just
 * a reply, or carries a navigation directive (open a Room, jump to
 * Dashboard, surface a Library topic) the client is expected to act on.
 */

export const CompanionMessageRequestSchema = z.object({
  text: z.string().min(1),
  clientMessageId: z.string(), // idempotency key — same role as the room command contract's
})
export type CompanionMessageRequest = z.infer<typeof CompanionMessageRequestSchema>

export const CompanionDirectiveSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('open_room'),
    roomType: z.enum(['decision', 'mirror']),
    roomId: z.string().optional(), // absent when the directive is "start a new one"
  }),
  z.object({ kind: z.literal('open_dashboard') }),
  z.object({ kind: z.literal('open_library_topic'), topicSlug: z.string() }),
])
export type CompanionDirective = z.infer<typeof CompanionDirectiveSchema>

export const CompanionMessageResponseSchema = z.object({
  sessionId: z.string(),
  reply: z.string(),
  directive: CompanionDirectiveSchema.nullable(),
})
export type CompanionMessageResponse = z.infer<typeof CompanionMessageResponseSchema>

/** GET /v1/companion/context — recent turns for resuming a chat, decrypted server-side. */
export const CompanionContextResponseSchema = z.object({
  sessionId: z.string().nullable(), // null if no active Companion session yet
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string(),
      createdAt: z.string().datetime(),
    })
  ),
})
export type CompanionContextResponse = z.infer<typeof CompanionContextResponseSchema>
