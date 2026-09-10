import { z } from 'zod'
import { DailyCardFeedbackSchema } from '../dynamo/continuity'
import {
  GUIDANCE_CARD_TOPICS,
  GUIDANCE_CARD_LIFE_DOMAINS,
  GUIDANCE_CARD_CORES,
  GUIDANCE_CARD_DEPTHS,
  GUIDANCE_CARD_MODES,
  GUIDANCE_CARD_STATES,
  GUIDANCE_CARD_ROUTES,
} from '../dynamo/global-tables'

/**
 * Companion — chat-first router (MVP_ARCHITECTURE.md §5.1). A Bedrock
 * Converse loop with a small tool-routing layer: the response is either just
 * a reply, or carries a navigation directive (open a Room, jump to
 * Dashboard, surface a Library topic) the client is expected to act on.
 */

export const CompanionMessageRequestSchema = z.object({
  text: z.string().min(1),
  clientMessageId: z.string(), // idempotency key — same role as the room command contract's
  // Discrete conversations — targets a specific conversation instead of
  // whatever the caller's pointer currently points at. Omitted = today's
  // pointer-based behavior (back-compat).
  sessionId: z.string().optional(),
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
  // Today's Daily Card, only when it exists and hasn't been dismissed yet —
  // spec §3/§4: Daily Card's primary surface is "Dashboard + Main Chat",
  // not Dashboard alone. Dismissing/giving feedback from here uses the same
  // POST /v1/daily-card/feedback endpoint Dashboard's own card uses, since
  // the state lives on the item, not either page.
  dailyCard: z
    .object({
      kind: z.enum(['thought', 'question', 'reminder', 'micro_practice']),
      text: z.string(),
      feedback: DailyCardFeedbackSchema.nullable(),
    })
    .nullable(),
})
export type CompanionContextResponse = z.infer<typeof CompanionContextResponseSchema>

/** GET /v1/companion/conversations — Recent Conversations, newest first. */
export const CompanionConversationsListResponseSchema = z.object({
  conversations: z.array(
    z.object({
      sessionId: z.string(),
      // Null only for the rare edge case where a session has zero messages
      // yet (a just-created, never-sent-to conversation) — the frontend
      // shows a placeholder label ("New conversation") in that case.
      title: z.string().nullable(),
      lastMessageAt: z.string().datetime(),
      createdAt: z.string().datetime(),
    })
  ),
})
export type CompanionConversationsListResponse = z.infer<typeof CompanionConversationsListResponseSchema>

/** POST /v1/companion/conversations — starts a new, empty conversation. */
export const CompanionCreateConversationResponseSchema = z.object({
  sessionId: z.string(),
})
export type CompanionCreateConversationResponse = z.infer<typeof CompanionCreateConversationResponseSchema>

/**
 * POST /v1/companion/pull-card — context-aware pull from the 300-card
 * library (`docs/DPNR_Pull_A_Card_300_Question_Bank_v2.pdf`). Metadata axes
 * mirror the source doc's own "Recommended metadata per card" (see
 * dynamo/global-tables.ts's `GuidanceCardItemSchema` doc comment for the
 * full reasoning). `directive` reuses `CompanionDirectiveSchema` rather than
 * inventing a parallel navigation contract — it's the server's resolution of
 * `suggestedRoute` into something the client can actually act on; `null`
 * covers `stay_on_card`/`main_chat` (no navigation needed, the card already
 * lives in Companion) and `journal` (no Journal destination exists yet,
 * flagged in the route enum's own doc comment) alike.
 */
export const PullCardResponseSchema = z.object({
  cardId: z.string(),
  text: z.string(),
  imageRef: z.string(),
  topic: z.enum(GUIDANCE_CARD_TOPICS),
  lifeDomain: z.enum(GUIDANCE_CARD_LIFE_DOMAINS).optional(),
  core: z.enum(GUIDANCE_CARD_CORES),
  depth: z.enum(GUIDANCE_CARD_DEPTHS),
  mode: z.enum(GUIDANCE_CARD_MODES),
  state: z.enum(GUIDANCE_CARD_STATES),
  suggestedRoute: z.enum(GUIDANCE_CARD_ROUTES),
  directive: CompanionDirectiveSchema.nullable(),
})
export type PullCardResponse = z.infer<typeof PullCardResponseSchema>
