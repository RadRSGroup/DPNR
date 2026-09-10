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

/**
 * The Library's primary browse axis (`DPNR_Content_Library_Master_Architecture_and_Complete_Content_v2.pdf`
 * Part I §3A "Explore by Theme") — one of 10 fixed themes every topic is
 * tagged with exactly one of, distinct from `lifeDomains` below (many-to-many).
 */
export const EXPLORE_THEMES = [
  'ME', 'FEEL', 'PATTERNS', 'NEED', 'RELATE', 'REPAIR', 'BODY', 'CHOOSE', 'CREATE', 'LIFE',
] as const
export type ExploreTheme = (typeof EXPLORE_THEMES)[number]

/** Content Library catalog — config-like, same profile as Prompt Registry. */
export const LibraryTopicVersionItemSchema = z.object({
  pk: z.string(), // GlobalKeys.libraryTopicPk(slug)
  sk: z.string(), // GlobalKeys.promptVersion(n) — reuse the same VERSION# convention
  // Redesigned this session (Content Library Master Architecture v2, superseding
  // the single-string `taxonomyCategory` this field replaces): the master doc's
  // own "Key Architecture Decision" is explicit — "do not organize the library as
  // one rigid tree... the same topic can belong to several life domains... at the
  // same time." `exploreTheme` is the one fixed primary axis (Part I §3A);
  // `lifeDomains` is the many-to-many secondary axis (Part I §3B) — a topic tagged
  // "All domains" in the source doc is stored as a real list of all 11 domain
  // names, not a sentinel, so callers never need to special-case that string.
  exploreTheme: z.enum(EXPLORE_THEMES),
  lifeDomains: z.array(z.string()),
  level: z.enum(['Foundation', 'Intermediate', 'Deep Dive']).optional(), // Part I §4 "Level"
  contentType: z.array(z.string()).optional(), // Part I §4 "Content Type" — e.g. ["Concept", "Distinction"], source combines with "/"
  relatedTopics: z.array(z.string()).optional(), // slugs — Part I §4 "Related Topics", resolved at seed time against the real catalog (an unresolved title in the source is dropped, not guessed)
  title: z.string(),
  // Authored content. Plaintext — this is DPNR's own taxonomy content, not
  // personal user data (same reasoning as this table's own top-of-section
  // comment). Added this session: the schema previously had nowhere to put
  // the actual topic body, which api/library.ts's
  // LibraryTopicDetailResponseSchema.body already expected — a real gap,
  // not a style choice, caught while wiring the first Library read handler.
  body: z.string(),
  // Intelligence Spec §18/§20 "Canonical Learning Topic Structure" —
  // KnowledgeTopic{}'s 5 authorable content sections, added for the
  // Contextual Learning & Side-Panel build (see library-topics-v2.seed.ts's
  // doc comment for current content provenance — the original
  // library-topics.seed.ts this comment once pointed at is retired). All
  // optional and additive: `body`
  // stays the authoritative "Understand" content, and a topic missing any
  // of these degrades honestly (the Side Panel shows "not yet written" for
  // that section) rather than fabricating or hiding it — this is what keeps
  // a future unauthored topic safe, not just today's 6.
  quickDefinition: z.string().optional(), // Quick Learn — 1-2 sentences, shown inline without leaving chat
  // Content Library Master Architecture v2's own Standard Learning Unit —
  // "EXPAND THE LENS" (a map of types/categories/distinctions) has no
  // equivalent in the older Intelligence Spec §20 shape this schema
  // originally followed, so it's a genuinely new field, not a rename.
  expandTheLens: z.string().optional(),
  howItMayShowUp: z.array(z.string()).optional(), // Recognize / "How It May Look In Real Life"
  possibleRoots: z.array(z.string()).optional(), // Possible Roots — tentative, never asserts one cause. Not part of the new content doc's own Learning Unit shape — stays undefined on every topic seeded from it, same honest-gap handling as any other unauthored section.
  reflectionQuestions: z.array(z.string()).optional(), // Personal Reflection / "Check In" — the new content doc gives exactly one check-in question per topic; still stored as an array (single-element) to avoid a second, narrower field next to this one.
  waysToWorkWithIt: z.array(z.string()).optional(), // Work With It / "Practice" — same single-element convention as reflectionQuestions above when sourced from the new content doc.
  // "GO DEEPER WITH DPNR" guidance text (free prose or a short list of
  // prompts, per the source) for personalizing further — distinct from
  // `recommendedRooms` below, which is a fixed routing enum, not guidance.
  goDeeperGuidance: z.array(z.string()).optional(),
  recommendedRooms: z.array(z.enum(['mirror', 'decision', 'companion'])).optional(), // Go Deeper routing — 'companion' added per the operating-spec's §20 Go Deeper list (Mirror Room, Decision Room, Companion, Evolution Map, or a related topic); Evolution Map isn't a live nav destination for this yet, left off rather than added as a dead link
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

/**
 * Pull a Card's own metadata taxonomy (`docs/DPNR_Pull_A_Card_300_Question_Bank_v2.pdf`
 * p.2 "Recommended metadata per card") — six axes, each a fixed enum the
 * source doc names explicitly. Deliberately kept as its own namespace, not
 * reconciled with Library's `ExploreTheme`/`lifeDomains` (global-tables.ts
 * above) or the pre-existing `LifeDomainCategorySchema` (dynamo/twin.ts) —
 * three "life domain"-shaped taxonomies now exist in this codebase for three
 * different features, each authored from its own source document at a
 * different time. Unifying them is a real product decision already flagged
 * as open tech debt (AGENT_LOG.md Session 45 / INTELLIGENCE_SPEC_AUDIT.md §4)
 * and out of scope here — this follows that same precedent rather than
 * inventing a fourth resolution unilaterally.
 */
export const GUIDANCE_CARD_TOPICS = [
  'SELF', 'FEEL', 'PATTERNS', 'NEEDS', 'LOVE', 'COURAGE', 'BODY', 'NEXT', 'CREATE', 'LIFE',
] as const
export type GuidanceCardTopic = (typeof GUIDANCE_CARD_TOPICS)[number]

export const GUIDANCE_CARD_LIFE_DOMAINS = [
  'Relationships', 'Family', 'Work-Career', 'Finance', 'Health', 'Personal Growth', 'Leisure',
  'Spirituality', 'Emotional Well-being',
] as const
export type GuidanceCardLifeDomain = (typeof GUIDANCE_CARD_LIFE_DOMAINS)[number]

export const GUIDANCE_CARD_CORES = [
  'Emotion', 'Need', 'Value', 'Boundary', 'Belief', 'Behavior', 'Pattern', 'Goal', 'Identity',
] as const
export type GuidanceCardCore = (typeof GUIDANCE_CARD_CORES)[number]

export const GUIDANCE_CARD_DEPTHS = ['Light', 'Everyday', 'Reflect', 'Deep'] as const
export type GuidanceCardDepth = (typeof GUIDANCE_CARD_DEPTHS)[number]

export const GUIDANCE_CARD_MODES = ['Notice', 'Ask', 'Choose', 'Remember', 'Act'] as const
export type GuidanceCardMode = (typeof GUIDANCE_CARD_MODES)[number]

export const GUIDANCE_CARD_STATES = [
  'Grounding', 'Curiosity', 'Clarity', 'Challenge', 'Expansion', 'Connection',
] as const
export type GuidanceCardState = (typeof GUIDANCE_CARD_STATES)[number]

/**
 * Source doc names this axis "Stay on Card / Journal / Main Chat / Mirror
 * Room / Decision Room" — stored here as the literal snake_case route key,
 * display labels live in the frontend. `journal` is a real, faithfully-kept
 * value (not dropped from the enum) even though no Journal destination
 * exists anywhere in this codebase yet (AGENT_LOG.md Session 45 flagged this
 * gap explicitly) — companion/pull-card.ts resolves it to no directive
 * (same honest-gap treatment as every other not-yet-buildable route below),
 * so a future Journal feature only needs to add one resolver case, not a
 * data migration.
 */
export const GUIDANCE_CARD_ROUTES = [
  'stay_on_card', 'journal', 'main_chat', 'mirror_room', 'decision_room',
] as const
export type GuidanceCardRoute = (typeof GUIDANCE_CARD_ROUTES)[number]

/**
 * Companion's "Pull a Card" library — same config-like, low-write-volume
 * profile as Plans/Library (authored content, not personal user data).
 * Deliberately flat (no version/alias split like Library topics): a card
 * has no draft-review lifecycle, just active/inactive. `source` future-proofs
 * an eventual auto-generate-from-template pipeline without a storage-shape
 * change; every card seeded today is 'manual'. `imageRef` points at the
 * existing companion/pull-a-card.webp placeholder for every card until real
 * per-card art exists — flagged, not faked.
 *
 * `topic` is guaranteed (the source doc's own 10x30 chapter structure gives
 * every card exactly one). `lifeDomain` is optional — a meaningful number of
 * the 300 cards (see guidance-cards.seed.ts's own doc comment) genuinely
 * don't land cleanly on one of the source's 9 life domains, and forcing a
 * best-guess domain onto a card like "What are you grateful for today?"
 * would be inventing a signal the card doesn't actually carry.
 */
export const GuidanceCardItemSchema = z.object({
  pk: z.string(), // GlobalKeys.guidanceCardPk(cardId)
  sk: z.literal('CONFIG'),
  text: z.string(),
  topic: z.enum(GUIDANCE_CARD_TOPICS),
  lifeDomain: z.enum(GUIDANCE_CARD_LIFE_DOMAINS).optional(),
  core: z.enum(GUIDANCE_CARD_CORES),
  depth: z.enum(GUIDANCE_CARD_DEPTHS),
  mode: z.enum(GUIDANCE_CARD_MODES),
  state: z.enum(GUIDANCE_CARD_STATES),
  suggestedRoute: z.enum(GUIDANCE_CARD_ROUTES),
  imageRef: z.string(),
  source: z.enum(['manual', 'generated']),
  active: z.boolean(),
  createdAt: z.string().datetime(),
})
export type GuidanceCardItem = z.infer<typeof GuidanceCardItemSchema>

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
