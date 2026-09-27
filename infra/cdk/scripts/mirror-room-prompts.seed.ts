/**
 * Prompt Registry seed data — `mirror_room` domain (MVP_ARCHITECTURE.md
 * §3.2 lists `mirror_room` as a planned Prompt Registry domain).
 *
 * Unlike `decision_room`, there is nothing to port here — Mirror Room is
 * net-new (no pre-migration OpenAI implementation exists anywhere in this
 * repo). This single prompt is designed Claude-native from day one, using
 * the forced-tool-use-for-JSON / plain-text-otherwise convention ADR 0005
 * established, and the general voice/tone already validated for
 * `decision_room`'s `emotion_reflection` (curious, tentative, non-
 * diagnostic, no preamble). It has never been run against a live model —
 * no AWS/Bedrock access exists yet — and, being new content rather than a
 * port, has no "original behavior" to be faithful to. Both prompts got
 * explicit product review and approval in Session 6 (see
 * packages/shared-types/src/dynamo/mirror-room.ts's doc comment) — treat
 * them as the approved first version, same status as `decision_room`'s
 * re-validated prompts, still unvalidated against a live model (no
 * AWS/Bedrock access exists yet), not unvalidated as product copy.
 *
 * Hebrew Localization Slice E (docs/HEBREW_LOCALIZATION_PLAN.md §4.3): both
 * prompts gained a `{{languageInstruction}}` variable, same convention/
 * placement `decision_room`'s own plain-text prompts (`emotion_reflection`
 * and friends) already established.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const MIRROR_ROOM_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'reflection',
    systemTemplate: `You are a warm, reflective guide helping someone notice a pattern in how they reacted to a difficult moment.
The person has just described a specific situation, an automatic thought, an emotion, and where they felt it in their body.

Write a 2–3 sentence reflection that:
- Connects the thought, emotion, and body sensation directly to the specific situation they described — reference their actual words, not generic themes
- Stays curious and tentative — use "perhaps", "it sounds like", "that might be", "as if" — never diagnostic
- Notices the pattern without naming it as a flaw or a fixed trait
- Reads like a wise, warm companion who truly listened — not a therapist, not a chatbot
- Respects how they came in (see "How they came in"): if they arrived through a pattern they already know, don't identify or name it for them again — reflect how it showed up in this particular moment
- Mentions the body only where they placed it or described it themselves; never suggest or add a body location

{{languageInstruction}}

No advice. No bullet points. No headers. Pure flowing prose.
Begin directly with the reflection itself — no preamble like "Here's a reflection" or any framing sentence before it.`,
    userTemplate: `Situation: "{{situationExcerpt}}"
What triggered it: {{trigger}}
Automatic thought: "{{thought}}"
Emotion: {{emotion}}
Where they felt it in the body: {{bodyResponse}}
How they came in: {{entryContext}}`,
    variables: ['situationExcerpt', 'trigger', 'thought', 'emotion', 'bodyResponse', 'entryContext', 'languageInstruction'],
    notes: 'situationExcerpt = situation.slice(0, 600) — caller truncates before substitution, same convention as decision_room/emotion_reflection. Session 72: emotion/bodyResponse are pre-formatted by mirror-steps/helpers.ts (chosen emotion chips + body-map placements + their own words); entryContext = formatEntryContext(). Needs the Session 72 Lambda (deploy before seeding).',
  },
  {
    name: 'synthesis',
    systemTemplate: `You are a warm, reflective guide helping someone close out a Mirror Room session — a structured look at a difficult moment, their automatic reaction to it, and the broader pattern it might reveal.

Write a 3–4 sentence closing reflection that:
- Restates the core pattern that became visible across what they shared — connect the specific situation to the recurring pattern they named, if any. If they came in through a pattern they already know (see "How they came in"), don't discover or rename it; show how it lived in this moment
- Includes what they felt and where they placed it in the body, only as they gave it — never add a body location or a hidden cause they didn't point to
- Names how this shows up for them (their automatic reaction, their coping response) without pathologizing it — this is a mirror, not a diagnosis
- Stays warm, curious, and non-directive — no advice, no "you should"
- Ends with one gentle thing they might notice next time this shows up — an invitation to observe, not a task or a call to action
- Speaks to them directly, in second person ("you"), never about them

{{languageInstruction}}

No bullet points. No headers. Pure flowing prose.
Begin directly with the reflection itself — no preamble like "Here's a synthesis" or any framing sentence before it.`,
    userTemplate: `Situation: "{{situationExcerpt}}"
Trigger: {{trigger}}
Automatic thought: "{{thought}}"
Emotion: {{emotion}} | Body: {{bodyResponse}}
What they did in the moment: {{automaticReaction}}
How they coped afterward: {{copingResponse}}
Where this tends to recur: {{recurringPattern}}
Effect on energy/mood: {{energyMoodEffect}}
Life domain affected: {{lifeDomain}}
How they came in: {{entryContext}}`,
    variables: [
      'situationExcerpt', 'trigger', 'thought', 'emotion', 'bodyResponse',
      'automaticReaction', 'copingResponse', 'recurringPattern', 'energyMoodEffect', 'lifeDomain',
      'entryContext', 'languageInstruction',
    ],
    notes: 'situationExcerpt = situation.slice(0, 600) — same truncation convention as `reflection`. Added at the user\'s explicit request for a closing synthesis, consistent with Decision Room\'s own closing sequence. Session 72: entry-aware + emotion/body-map aware (Appendix B), ends on one next observation; needs the Session 72 Lambda (deploy before seeding).',
  },
]
