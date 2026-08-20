/**
 * Prompt Registry seed data — `twin` domain (MVP_ARCHITECTURE.md §3.2/§5;
 * spec §5 "Signal model"/"Trust rules"). Net-new, like `mirror_room` and
 * `library` — designed Claude-native from the start, no OpenAI legacy.
 *
 * One prompt, `extract_signals`, called once per completed Decision Room or
 * Mirror Room session (see `rooms/decision-steps/commitment.ts` and
 * `rooms/mirror-steps/commitment.ts`) — never per chat turn, per the spec's
 * own trust rule "Not every chat turn updates the Digital Twin." Shared
 * across both room types via `{{roomType}}` rather than duplicated near-
 * identically per room, matching this repo's existing shared-Lambda/shared-
 * prompt-logic conventions elsewhere (one command dispatcher for both
 * rooms, one `model-call.ts` for every caller).
 *
 * Forced tool-use (`outputSchema` set) per ADR 0005 — this needs a
 * structured array of signals, not free text.
 *
 * Has never been run against a live model with a real transcript — a
 * design-level first draft, same status Mirror Room's prompts had before
 * their Session 6 product review. Flag for review before treating the
 * extraction *behavior* (which domains it reaches for, how conservative it
 * is) as final; the calling convention and data plumbing are what this
 * session actually verified live.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const TWIN_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'extract_signals',
    systemTemplate: `You are a careful, conservative pattern-recognition layer inside a personal-development app. You read the summary of one completed guided session (Decision Room or Mirror Room) and decide whether anything genuinely meaningful emerged that's worth remembering about this person — never whether something merely *could* be inferred.

Only extract a signal when the session gives real, specific evidence for it. Most sessions will produce zero or one signal — extracting a signal from every session is a failure mode, not a success. When genuinely uncertain, extract nothing rather than stretch for content.

For each signal you do extract:
- domain: exactly one of "pattern" (a recurring reaction/loop), "trigger" (something that reliably provokes a reaction), "value" (something they protect or seek), or "commitment" (a concrete action they committed to). Only "commitment" applies to a Decision Room session's own literal commitment text — never infer a commitment from anything else.
- description: one plain sentence, written from an outside observer's perspective (not "I" — "you"), using tentative language ("seems to", "may be emerging as") for anything inferred rather than explicitly stated by the person themselves.
- confidence: 0–1. Use 0.9+ only for something the person stated directly in their own words. Use lower confidence the more this is your own inference from their behavior/choices rather than their explicit statement.

Never invent detail beyond what the session summary actually contains. Never assign a fixed trait or label to the person — describe a pattern or moment, not an identity.`,
    userTemplate: `Session type: {{roomType}}

Session summary:
{{sessionSummary}}`,
    variables: ['roomType', 'sessionSummary'],
    outputSchema: {
      type: 'object',
      required: ['signals'],
      properties: {
        signals: {
          type: 'array',
          items: {
            type: 'object',
            required: ['domain', 'description', 'confidence'],
            properties: {
              domain: { type: 'string', enum: ['pattern', 'trigger', 'value', 'commitment'] },
              description: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    },
    notes:
      'roomType = "Decision Room" | "Mirror Room" (human-readable, not the internal DECISION/MIRROR flowId). ' +
      'sessionSummary = a plain-text assembly of the session\'s real content (see gatherDecisionContext/ ' +
      'MirrorContent in each commitment.ts caller) — never raw encrypted blobs, always already-decrypted text.',
  },
]
