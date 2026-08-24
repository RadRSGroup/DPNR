/**
 * Prompt Registry seed data — `daily_card` domain (MVP_ARCHITECTURE.md
 * §3.2/§5.7). Net-new, like `twin`/`mirror_room`/`library` — designed
 * Claude-native, no legacy prompt to port.
 *
 * Called once per user per day by `continuity/compose-daily-card.ts`
 * (`aws-events.Rule` cron target, not on-demand), never at read time —
 * `GET /v1/daily-card` is a pure cache hit over whatever this wrote.
 *
 * Spec §6's anti-addiction rules apply directly here ("no infinite feed, no
 * streak pressure, no variable-reward loops") — the system prompt says so
 * explicitly rather than leaving it as an unstated hope. Forced tool-use
 * (`outputSchema` set) per ADR 0005, matching `DailyCardItemSchema`'s
 * content shape (`dynamo/continuity.ts`).
 *
 * Live-verified once against a real model with real user data (Session 11
 * — see docs/AGENT_LOG.md): a throwaway user's actual Mirror Room session
 * produced specific, non-generic output with no streak/urgency language.
 * That's one manual smoke test, not a tone/cadence product review at
 * scale — the actual composed *content* should still be flagged for a real
 * product review before being treated as final, same status Mirror Room's/
 * twin's prompts had before theirs.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const DAILY_CARD_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'compose',
    systemTemplate: `You compose one small, quiet card for a personal-development app's daily check-in. This is not a notification feed, a streak, or a nudge to re-engage — it's a single grounded thought offered once a day, easy to ignore, never urgent.

Choose exactly one kind:
- "thought": a brief reflective observation, grounded in what's actually known about this person below.
- "question": one open question worth sitting with today, drawn from a real pattern or trigger below.
- "reminder": a gentle reference back to something they themselves named as important (a value, a commitment) — never a generic self-help reminder.
- "micro_practice": one small, concrete, doable-in-under-a-minute action tied to a real pattern below.

Ground everything in the confirmed signals and recent session summary given below — never invent a trait, pattern, or event that isn't actually there. If the material is thin, write something small and honest rather than stretching for false specificity. Never use urgency, streaks, "don't break your streak," countdown, or FOMO language of any kind — the product's own design rule forbids it. Keep the text to 1–2 short sentences, warm and plain, never clinical or diagnostic.`,
    userTemplate: `Confirmed signals about this person (most recent first):
{{confirmedSignals}}

Most recent session summary:
{{recentSummary}}`,
    variables: ['confirmedSignals', 'recentSummary'],
    outputSchema: {
      type: 'object',
      required: ['kind', 'text'],
      properties: {
        kind: { type: 'string', enum: ['thought', 'question', 'reminder', 'micro_practice'] },
        text: { type: 'string' },
      },
    },
    notes:
      'confirmedSignals = "- (domain) description" lines, up to 5 most recent confirmed signals, or "(none yet)". ' +
      'recentSummary = the single most recent SessionSummaryItem\'s plain-text summary, or "(none yet)". ' +
      'compose-daily-card.ts skips calling this prompt entirely (writes nothing) when both are "(none yet)" — ' +
      'never composes a card from nothing.',
  },
]
