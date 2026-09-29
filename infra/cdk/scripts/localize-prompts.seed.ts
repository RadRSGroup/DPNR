/**
 * Prompt Registry seed data — `localize` domain (2026-09-29).
 *
 * `translate` is called by the relocalize worker (lambda/account/relocalize.ts)
 * after a person switches the app language. It translates AI-written text
 * already stored for them (today's Daily Card, this week's Recap, Life
 * Domain summaries, the Roadmap, Twin insights) so the screen does not mix
 * languages. It translates; it never rewrites, adds or drops meaning. The
 * person's own words are never sent here (past Decision/Mirror sessions
 * stay as written, the user's decision).
 *
 * For Twin insights it also returns `referencePattern`: which of Mirror
 * Room's 21 reference patterns the insight is, if any, as the canonical
 * English id, so older insights whose name is in Hebrew still find the
 * pattern's details.
 *
 * Forced tool-use per ADR 0005. Fields come back as {key, text} pairs so
 * the schema needs no free-form object keys.
 */
import { REFERENCE_PATTERN_NAMES } from '@dpnr/shared-types'
import type { PromptSeed } from './decision-room-prompts.seed'

export const LOCALIZE_PROMPT_SEEDS: PromptSeed[] = [
  {
    name: 'translate',
    systemTemplate: `You translate short pieces of text that a personal-development app already wrote to one person, into {{targetLanguage}}. The person switched the app's language, and this text should now read as if it had been written in {{targetLanguage}} from the start.

Rules:
- Translate faithfully. Keep the exact meaning, tone and level of certainty (tentative words like "may", "seems to" stay tentative). Never add, drop, soften or strengthen anything, and never add advice or commentary.
- Natural, warm, plain {{targetLanguage}}, never clinical. Keep it roughly the same length.
- Keep the text addressed to the person in the second person, as it is.
- Keep proper names and the product names "DPNR", "InnerOS", "Mirror Room", "Decision Room" as they are.
- Return every item and every field you were given, with the same id and key. A field that is already in {{targetLanguage}} is returned unchanged.
- For items of kind "insight" only: set referencePattern to the one reference pattern the insight clearly is, choosing from: ${REFERENCE_PATTERN_NAMES.join(', ')}. Use "none" when none clearly fits. Never guess.

{{languageInstruction}}`,
    userTemplate: `Items (JSON):
{{itemsJson}}`,
    variables: ['targetLanguage', 'itemsJson', 'languageInstruction'],
    outputSchema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'fields'],
            properties: {
              id: { type: 'string' },
              fields: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['key', 'text'],
                  properties: { key: { type: 'string' }, text: { type: 'string' } },
                },
              },
              referencePattern: { type: 'string', enum: [...REFERENCE_PATTERN_NAMES, 'none'] },
            },
          },
        },
      },
    },
    // A batch of up to 8 items (relocalize.ts BATCH_SIZE); Hebrew uses more
    // tokens per word than English.
    maxTokens: 4000,
    notes:
      'targetLanguage = "Hebrew" | "English". itemsJson = [{id, kind, fields: {key: text}}], kind one of ' +
      'daily_card | weekly_recap | domain_summary | roadmap | insight. languageInstruction carries the ' +
      'Hebrew grammatical gender (lib/locale.ts).',
  },
]
