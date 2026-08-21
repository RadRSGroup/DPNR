/**
 * Prompt Registry seed data — `weekly_recap` domain (MVP_ARCHITECTURE.md
 * §3.2/§5.7). Net-new, same lineage as `daily_card`/`twin`/`mirror_room`.
 *
 * Called once per user per week by `continuity/compose-weekly-recap.ts`
 * (`aws-events.Rule` cron target), never at read time — `GET
 * /v1/weekly-recap` is a pure cache hit. Forced tool-use (`outputSchema`
 * set) per ADR 0005, matching `WeeklyRecapItemSchema`'s content shape and
 * `WeeklyRecapResponseSchema`'s four fields exactly (`dynamo/continuity.ts`,
 * `api/continuity.ts`).
 *
 * Has never been run against a live model with real user data — a
 * design-level first draft, same status every other net-new prompt domain
 * had before its own product review. Flag for review before treating the
 * actual composed *content* as final.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const WEEKLY_RECAP_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'compose',
    systemTemplate: `You compose a short weekly recap for a personal-development app, covering only the last 7 days of this specific person's activity. This is a quiet look back, not a progress report, a score, or a streak — never frame anything as a win/loss or a percentage.

Ground every sentence in the confirmed signals and session summaries from this week given below — never invent an event, pattern, or number that isn't actually there. If the week's material is thin, say something small and honest rather than manufacturing significance.

Fill four short fields, each 1–2 plain sentences:
- stoodOut: what genuinely stood out this week, if anything did.
- shifted: something that seems to have shifted or moved, even slightly — or say nothing shifted if that's honestly true.
- remainsActive: a pattern, trigger, or open thread that's still active and unresolved.
- suggestion: one small, concrete, optional thing worth considering next — never phrased as an instruction or a task they must complete.

Warm, plain language throughout — never clinical, never diagnostic, never urgent.`,
    userTemplate: `Confirmed signals updated this week (most recent first):
{{weekSignals}}

Session summaries from this week (most recent first):
{{weekSummaries}}`,
    variables: ['weekSignals', 'weekSummaries'],
    outputSchema: {
      type: 'object',
      required: ['stoodOut', 'shifted', 'remainsActive', 'suggestion'],
      properties: {
        stoodOut: { type: 'string' },
        shifted: { type: 'string' },
        remainsActive: { type: 'string' },
        suggestion: { type: 'string' },
      },
    },
    notes:
      'weekSignals/weekSummaries = "- (domain) description" / "- summary" lines, filtered to the last 7 days ' +
      'only (not all-time, unlike daily_card/compose\'s confirmedSignals) — see gather-context.ts\'s ' +
      'all-time read plus compose-weekly-recap.ts\'s own 7-day filter. Either can be "(none this week)" — ' +
      'compose-weekly-recap.ts skips calling this prompt entirely when both are, never composes a recap from nothing.',
  },
]
