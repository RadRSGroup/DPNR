/**
 * Prompt Registry seed data — `companion` domain (MVP_ARCHITECTURE.md
 * §3.2/§5.1; spec §4 "Companion" feature contract). Net-new, like
 * `mirror_room`/`library`/`twin`/`daily_card`/`weekly_recap` — designed
 * Claude-native, no OpenAI legacy to port (Companion never existed in the
 * pre-migration codebase at all).
 *
 * One prompt, `respond`, called on every `POST /v1/companion/message` turn
 * (companion/message.ts) — replacing the `callCompanionModel` stub
 * (companion/model-stub.ts, deleted this session now that a real domain
 * exists for it to call).
 *
 * Forced tool-use (`outputSchema` set) per ADR 0005: the spec's own
 * contract for Companion is "a Bedrock Converse loop with a small
 * tool-routing layer" (§5.1) — the reply text and the routing decision are
 * one structured output, not a free-text reply plus a separate JSON-parse
 * attempt. Rather than a `directive` object whose shape depends on
 * `directiveKind` (JSON Schema has no clean way to make Bedrock enforce
 * that conditional shape, and no other prompt in this registry uses
 * anyOf/oneOf — see decision-room/twin/daily-card's seeds), this schema
 * stays flat: `directiveKind` plus every directive kind's own optional
 * field, and `message.ts`'s `buildDirective()` assembles the real
 * `CompanionDirective` (packages/shared-types/src/api/companion.ts) from
 * whichever fields the `directiveKind` actually calls for, discarding the
 * rest. An inconsistent combination (e.g. `directiveKind: "open_room"`
 * with no `roomType`) degrades to no directive at all, never a thrown
 * error — a bad routing suggestion must never break the chat reply itself.
 *
 * `open_library_topic` is only ever allowed to name a slug that's actually
 * in the live Library catalog — the system prompt is told exactly which
 * slugs exist (via `{{libraryTopics}}`, built from the same
 * `listActiveTopics()` helper library/topics.ts's own public listing uses,
 * see lib/library-catalog.ts) rather than trusting the model to remember or
 * invent one. `open_room`'s directive never carries a `roomId` — Companion
 * only ever proposes *starting* a new Room, never resuming a specific
 * existing session id, since it has no session list to choose from here.
 *
 * Explicitly out of scope for this prompt (unchanged by this session):
 * Digital Twin extraction. Per the spec's own trust rule ("not every chat
 * turn updates the Digital Twin") and twin-prompts.seed.ts's existing
 * convention, extraction only ever fires once, at real session completion
 * (`rooms/twin-signals.ts`, called from each Room's `COMMITMENT` step) —
 * adding a second extraction path per Companion turn would contradict that
 * established precedent for no stated need.
 *
 * Has never been run against a live model — a design-level first draft,
 * same status every other net-new prompt domain had before its own product
 * review (Mirror Room/twin/library/daily_card/weekly_recap all went through
 * this same "flag for review" status before theirs). Flag for review before
 * treating the actual response *tone* as final; the calling convention and
 * routing-directive shape are what this session's live verification covers.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const COMPANION_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'respond',
    systemTemplate: `You are DPNR's Companion — the persistent conversational home base and router for the whole DPNR system, not a single-purpose chatbot. The person can simply say what's on their mind; you understand it, respond usefully, and route them onward only when that genuinely helps.

How to respond:
- Restore relevant context from the conversation so far — never ask the person to repeat something you can already see below.
- Ask at most one meaningful question at a time, and only when it actually moves things forward.
- Match the depth of your reply to what they actually brought — a quick check-in gets a quick reply; something substantial gets real attention.
- Stay warm, curious, and non-diagnostic. Never label the person with a fixed trait, type, or diagnosis, and never state a guess about them as if it were a certainty.
- Never claim to know about anything (a calendar, a device, an app, an event) that hasn't actually been said in this conversation.
- Offer a transition into a guided Room, the Dashboard, or a Library topic only when it's clearly useful right now — don't force one, and never manufacture urgency, streak pressure, or engagement tactics to get them to move.

How to set directiveKind:
- "open_room" with roomType "decision" — the person is wrestling with a real decision between options.
- "open_room" with roomType "mirror" — the person is describing a reactive moment, a trigger, or a recurring pattern worth reflecting on structurally.
- "open_dashboard" — the person wants to see their overall progress, orientation, or "the whole picture" rather than keep talking.
- "open_library_topic" with topicSlug set to the exact slug of one topic from the list below — only when it's a strong, specific match to what they just said. Never invent a slug that isn't in that list.
- "none" — an ordinary conversational reply with no transition. This is the right choice most of the time.

Output the reply text and the directive decision together, every turn.`,
    userTemplate: `Recent conversation so far (oldest to newest):
{{conversationHistory}}

Library topics you may route to (slug: title):
{{libraryTopics}}

The person's latest message:
"{{currentMessage}}"`,
    variables: ['conversationHistory', 'libraryTopics', 'currentMessage'],
    outputSchema: {
      type: 'object',
      required: ['reply', 'directiveKind'],
      properties: {
        reply: { type: 'string' },
        directiveKind: {
          type: 'string',
          enum: ['none', 'open_room', 'open_dashboard', 'open_library_topic'],
        },
        roomType: { type: 'string', enum: ['decision', 'mirror'] },
        topicSlug: { type: 'string' },
      },
    },
    notes:
      'conversationHistory = up to MODEL_CONTEXT_MESSAGES (message.ts) prior turns as "User: ..."/"Companion: ..." lines, ' +
      'oldest first, or "(no prior messages — this is the start of the conversation)". ' +
      'libraryTopics = "- slug: title" lines from listActiveTopics() (lib/library-catalog.ts), or "(none available)". ' +
      'roomType/topicSlug are only meaningful (and only read by buildDirective()) when directiveKind names the kind ' +
      'that uses them — the model is expected to omit them otherwise, but message.ts never trusts that and validates ' +
      'the combination before building a real CompanionDirective.',
  },
]
