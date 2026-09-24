/**
 * Prompt Registry seed data — `roadmap` domain (Session 16). One prompt,
 * `revise`, called from `twin/confirm.ts` right after a signal moves
 * candidate→confirmed — the "evidence justifies it" moment spec §5 names,
 * per the user's own direct choice of trigger (not decided unilaterally,
 * see docs/AGENT_LOG.md Session 16). Forced tool-use (ADR 0005) — needs a
 * structured yes/no decision plus, conditionally, the actual revision.
 *
 * Deliberately conservative by design, same "most sessions extract zero
 * signals" discipline `twin/extract_signals` already applies — most confirm
 * actions should NOT produce a revision. Has never run against a live
 * model with real confirmed-signal data — a design-level first draft, same
 * status every other net-new prompt domain gets before its own product
 * review (flag the actual revision *behavior* — how eager or conservative
 * it is — for that review; this session only verified the calling
 * convention and data plumbing live).
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const ROADMAP_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'revise',
    systemTemplate: `You maintain a person's Roadmap inside a personal-development app — their current focus, the deeper theme underneath it, and the direction they seem to be moving toward. You're reviewing it because they just confirmed a new piece of evidence about themselves.

Most of the time nothing has really changed — a single new confirmed signal rarely justifies revising an already-established Roadmap. Only propose a revision when the full body of confirmed evidence genuinely no longer matches the current Roadmap, or clearly extends it in a way worth naming. When in doubt, decide no revision is needed — extracting a revision from every confirmation is a failure mode, not a success.

If you do decide a revision is warranted, write:
- currentFocus: a short phrase for what's most alive for them now.
- theme: a short phrase naming the deeper pattern underneath it.
- direction: a short phrase for the shift they seem to be moving toward.
- suggestedSpaces: zero to two spaces from the allowed list, only ones that genuinely fit the current evidence — never pad this out.
- rationale: one short, plain sentence explaining what changed and why this update reflects it. This is shown directly to the person as the reason for the proposed change — write it to them, in second person, not about them.

Never revise for the sake of it. Never invent detail beyond what the confirmed evidence actually supports. Never label the person with a fixed trait or type.

Allowed suggestedSpaces values: "Mirror Room", "Decision Room", "Library".

{{languageInstruction}}`,
    userTemplate: `Current Roadmap:
Current focus: {{currentFocus}}
Theme: {{theme}}
Direction: {{direction}}

All confirmed evidence about this person so far, most recent first:
{{confirmedSignals}}`,
    variables: ['currentFocus', 'theme', 'direction', 'confirmedSignals', 'languageInstruction'],
    outputSchema: {
      type: 'object',
      required: ['shouldRevise'],
      properties: {
        shouldRevise: { type: 'boolean' },
        currentFocus: { type: 'string' },
        theme: { type: 'string' },
        direction: { type: 'string' },
        suggestedSpaces: {
          type: 'array',
          items: { type: 'string', enum: ['Mirror Room', 'Decision Room', 'Library'] },
        },
        rationale: { type: 'string' },
      },
    },
    notes:
      'Called by lib/roadmap-revision.ts. currentFocus/theme/direction = the live Roadmap\'s current fields ' +
      '(passed even though the model may echo them back unchanged, so it has the actual baseline to compare ' +
      'against). confirmedSignals = every confirmed Twin signal for this user as "- (domain) description" lines ' +
      '(gatherContinuityContext, same helper compose-daily-card.ts/compose-weekly-recap.ts already use), not just ' +
      'the one just confirmed — a revision decision needs the whole picture, not one isolated data point. ' +
      'currentFocus/theme/direction/rationale on the output are only read (and even then only if all four are ' +
      'non-empty) when shouldRevise is true — same "don\'t trust the flag alone" rule companion/onboard already ' +
      'follows for readyForRoadmap. languageInstruction (Hebrew Localization Slice E) — all four free-text ' +
      'outputs are real user-facing prose (rationale explicitly so, per its own field doc above; ' +
      'currentFocus/theme/direction are shown on Dashboard\'s Roadmap widget), so unlike twin/classify_signal ' +
      'this prompt needs the var even though most of its output is short phrases rather than long text.',
  },
  {
    // Session 68 — see lib/roadmap-refresh.ts. Unlike `revise` (conservative,
    // proposal-only, triggered by a signal confirm), this runs after every
    // completed Decision/Mirror session and its output is written straight
    // to the live Roadmap — the user's own choice ("it should update with
    // new decisions"). So it always returns a Roadmap; there is no
    // shouldRevise escape hatch.
    name: 'refresh',
    systemTemplate: `You maintain a person's Roadmap inside a personal-development app: their current focus, the deeper theme underneath it, and the direction they seem to be moving toward. It is shown on their Dashboard and Evolution Map, and it is refreshed every time they finish a Decision Room or Mirror Room session.

Write the Roadmap that best reflects where they are now, across everything they have worked on — not only their first session, and not only the most recent one. Give the most recent session the most weight: it is what is most alive for them today. If earlier sessions share a thread with it, name that thread in the theme. If the newest session is about something different, let the focus move to it rather than holding on to an older subject.

Write:
- currentFocus: a short phrase for what's most alive for them now.
- theme: a short phrase naming the deeper pattern that connects their sessions.
- direction: a short phrase for the shift they seem to be moving toward.
- suggestedSpaces: zero to two spaces from the allowed list that genuinely fit — never pad this out.

Stay close to what they actually wrote. Never invent detail, never diagnose, never label the person with a fixed trait or type. Short phrases, warm and plain, not clinical.

Allowed suggestedSpaces values: "Mirror Room", "Decision Room", "Library".

{{languageInstruction}}`,
    userTemplate: `Current Roadmap (may be outdated):
Current focus: {{currentFocus}}
Theme: {{theme}}
Direction: {{direction}}

Their completed sessions, most recent first:
{{recentSessions}}

Confirmed evidence about them:
{{confirmedSignals}}`,
    variables: ['currentFocus', 'theme', 'direction', 'recentSessions', 'confirmedSignals', 'languageInstruction'],
    outputSchema: {
      type: 'object',
      required: ['currentFocus', 'theme', 'direction', 'suggestedSpaces'],
      properties: {
        currentFocus: { type: 'string' },
        theme: { type: 'string' },
        direction: { type: 'string' },
        suggestedSpaces: {
          type: 'array',
          items: { type: 'string', enum: ['Mirror Room', 'Decision Room', 'Library'] },
        },
      },
    },
    notes:
      'Called by lib/roadmap-refresh.ts from both rooms\' COMMITMENT steps. currentFocus/theme/direction = the ' +
      'live Roadmap ("(none yet)" if onboarding never wrote one). recentSessions = up to 8 SessionSummaryItems, ' +
      'newest first, each capped at 1500 chars. confirmedSignals = up to 20 "- (domain) description" lines or ' +
      '"(none confirmed yet)". Output is validated (all three phrases non-empty, spaces filtered to the allowed ' +
      'list) and written directly to ROADMAP, superseding any pending ROADMAP#PROPOSED.',
  },
]
