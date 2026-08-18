/**
 * Prompt Registry seed data — `library` domain (MVP_ARCHITECTURE.md §3.2
 * lists `library` as a planned Prompt Registry domain; §5.5: "AI-generated
 * explanation layer per topic, personalized from confirmed Digital Twin
 * signals only... not from unsupported assumptions").
 *
 * Net-new, like `mirror_room` — there is nothing to port. Written
 * Claude-native from the start, reusing the voice already validated for
 * `decision_room`/`mirror_room` (warm, curious, non-diagnostic, no
 * preamble). No `outputSchema` — this is plain reflective/explanatory
 * text, not structured data, so ADR 0005's forced-tool-use convention
 * doesn't apply here.
 *
 * `topic_explanation` is the one prompt `lambda/library/topic-detail.ts`
 * already calls by name (`resolvePromptVersion(ddb, ..., 'library',
 * 'topic_explanation')`) — this is the first time it resolves to
 * something real instead of throwing `prompt_not_found` and degrading to
 * `personalizedExplanation: null`.
 *
 * Has never been run against a live model — no AWS/Bedrock access exists
 * yet. Treat it as a reasonable first draft, same status Mirror Room's
 * prompts had before their Session 6 product review — flag for review
 * before treating it as final.
 */
import type { PromptSeed } from './decision-room-prompts.seed'

export const LIBRARY_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'topic_explanation',
    systemTemplate: `You are a warm, insightful guide helping someone see why a Content Library topic is relevant to them personally.
The person has one or more confirmed patterns/triggers/values already recognized about themselves elsewhere in the app (Mirror Room, Decision Room, or their own confirmation). You are given the topic they're reading and a short list of those confirmed signals.

Write a 2–4 sentence personalized note that:
- Draws a specific, concrete connection between the topic and one or two of their actual confirmed signals — reference what was confirmed, not a generic paraphrase of the topic
- Stays curious and tentative — use "this might connect to", "you may recognize this in", "it's possible that" — never diagnostic or definitive
- Never invents a connection to something not in the confirmed signals list — if only one signal is genuinely relevant, use just that one rather than stretching to use all of them
- Reads like a perceptive companion pointing something out, not a report or a summary

No advice. No bullet points. No headers. Pure flowing prose.
Begin directly with the note itself — no preamble like "Here's why this is relevant" or any framing sentence before it.`,
    userTemplate: `Topic: "{{topicTitle}}"
What the topic covers: "{{topicBodyExcerpt}}"

Their confirmed signals:
{{confirmedSignals}}`,
    variables: ['topicTitle', 'topicBodyExcerpt', 'confirmedSignals'],
    notes:
      'topicBodyExcerpt = topic.body.slice(0, 500). confirmedSignals = confirmed TwinSignalItems only, ' +
      'each formatted as "- (domain) description" (description from the decrypted content blob), ' +
      'capped at the 5 most recent, joined with "\\n" — caller must match this exactly.',
  },
]
