import { z } from 'zod'

/**
 * Prompt Registry — separate table, config-like data (migration plan §8).
 * Plaintext: this is DPNR's authored prompt configuration, not personal data.
 */
export const PromptVersionItemSchema = z.object({
  pk: z.string(), // GlobalKeys.promptRegistryPk(app, name)
  sk: z.string(), // GlobalKeys.promptVersion(n)
  systemTemplate: z.string(),
  userTemplate: z.string(),
  variables: z.array(z.string()),
  modelParams: z.object({
    model: z.string(), // Bedrock Converse model ID, e.g. "anthropic.claude-sonnet-4-5-20250929-v1:0" — confirm against the deploy region's current model catalog, IDs/availability drift over time
    temperature: z.number().min(0).max(1), // Claude's Converse API clamps to [0,1], unlike OpenAI's [0,2] — was max(2) when these prompts were still gpt-4o-only
    maxTokens: z.number().int().positive(),
  }),
  // JSON-schema-shaped. When present, the Prompt Registry Lambda MUST invoke Bedrock with a
  // single forced tool call (tool_choice: {type: "tool", name: <fixed>}, input_schema: outputSchema)
  // and read the result from the tool_use block's `input` — not by parsing free text as JSON.
  // Claude has no equivalent to OpenAI's response_format:"json_object"; forced tool-use is the
  // reliable substitute (also incidentally eliminates the "preamble before the JSON" failure mode).
  outputSchema: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'active', 'retired']),
  createdAt: z.string().datetime(),
  author: z.string(),
  changelog: z.string().optional(),
})
export type PromptVersionItem = z.infer<typeof PromptVersionItemSchema>

export const PromptAliasItemSchema = z.object({
  pk: z.string(), // GlobalKeys.promptRegistryPk(app, name)
  sk: z.string(), // GlobalKeys.promptAlias(alias) — "prod" | "canary" | ...
  version: z.number().int().min(1),
  updatedAt: z.string().datetime(),
})
export type PromptAliasItem = z.infer<typeof PromptAliasItemSchema>

/**
 * Session Tickets — separate table, deliberately NO PITR / backups / streams
 * (migration plan §6.5, §5). TTL is a cleanup backstop, not the security
 * boundary — code must still check expiresAt and delete explicitly.
 */
export const SessionTicketPurposeSchema = z.enum(['active_session', 'post_session'])
export type SessionTicketPurpose = z.infer<typeof SessionTicketPurposeSchema>

export const SessionTicketItemSchema = z.object({
  pk: z.string(), // GlobalKeys.sessionTicketPk(userId)
  sk: z.string(), // GlobalKeys.sessionTicketSk(sessionId)
  kmsWrappedDek: z.string(), // base64 KMS ciphertext blob — never the plaintext DEK
  purpose: SessionTicketPurposeSchema,
  createdAt: z.string().datetime(),
  lastActivity: z.string().datetime(),
  expiresAt: z.string().datetime(), // sliding expiry — code-enforced, not just DynamoDB TTL
  ttl: z.number().int(), // epoch seconds, DynamoDB TTL attribute (cleanup backstop only)
})
export type SessionTicketItem = z.infer<typeof SessionTicketItemSchema>

/** Content Library catalog — config-like, same profile as Prompt Registry. */
export const LibraryTopicVersionItemSchema = z.object({
  pk: z.string(), // GlobalKeys.libraryTopicPk(slug)
  sk: z.string(), // GlobalKeys.promptVersion(n) — reuse the same VERSION# convention
  taxonomyCategory: z.string(), // e.g. "Inner World", "Values & Needs" (MVP spec §Content Library taxonomy)
  title: z.string(),
  status: z.enum(['draft', 'active', 'retired']),
  createdAt: z.string().datetime(),
})
export type LibraryTopicVersionItem = z.infer<typeof LibraryTopicVersionItemSchema>

export const LibraryTopicAliasItemSchema = z.object({
  pk: z.string(), // GlobalKeys.libraryTopicPk(slug)
  sk: z.string(), // GlobalKeys.promptAlias(alias)
  version: z.number().int().min(1),
  updatedAt: z.string().datetime(),
})
export type LibraryTopicAliasItem = z.infer<typeof LibraryTopicAliasItemSchema>

/** Plans/Packages catalog — kept configurable per spec §Beta Trial, not hard-coded into product logic. */
export const PlanItemSchema = z.object({
  pk: z.string(), // GlobalKeys.planPk(planId)
  sk: z.literal('CONFIG'),
  displayName: z.string(),
  kind: z.enum(['credit_pack', 'subscription']),
  credits: z.number().int().positive(),
  priceMinorUnits: z.number().int().nonnegative(), // e.g. agorot for ILS
  currency: z.string(), // e.g. "ILS"
  billingFrequency: z.enum(['one_time', 'monthly']).optional(),
  active: z.boolean(),
})
export type PlanItem = z.infer<typeof PlanItemSchema>
