import { z } from 'zod'

/**
 * Safety/crisis contract (spec §30, Appendix C's minimum safety-state
 * schema) — the highest-priority gap `docs/INTELLIGENCE_SPEC_AUDIT.md`
 * found (Critical Finding #1), scoped in `docs/SAFETY_SYSTEM_DESIGN.md`,
 * decided in ADR 0012. Six states, straight from the spec's own table —
 * do not add, remove, or rename a state without re-reading spec §30 and
 * updating the `classify_safety_state` prompt (infra/cdk/scripts/safety-prompts.seed.ts)
 * to match.
 */
export const SafetyStateSchema = z.enum([
  'normal',
  'deep_reflection',
  'overload',
  'high_stakes',
  'safety_concern',
  'immediate_danger',
])
export type SafetyState = z.infer<typeof SafetyStateSchema>

export const SafetySourceSurfaceSchema = z.enum(['companion', 'decision_room', 'mirror_room'])
export type SafetySourceSurface = z.infer<typeof SafetySourceSurfaceSchema>

/**
 * USER#<id> / SAFETY#EVENT#<eventId> — one item per classification call
 * that resulted in anything other than `normal` (see `classifySafety()` in
 * `infra/cdk/lambda/lib/safety.ts` — `normal` results are not persisted at
 * all, to avoid writing a row for every single ordinary turn). `ttl` is a
 * DynamoDB TTL attribute (90 days, ADR 0012) — `dpnr-application`'s table
 * definition (`infra/cdk/lib/data-stack.ts`) must have
 * `timeToLiveAttribute: 'ttl'` set for this to actually expire anything.
 *
 * HARD RULE (spec §30: "Safety data is not identity data... must not
 * become a Core Pillar score, archetype, personality trait, Roadmap
 * theme"): this must stay a structurally separate item family from
 * `TwinSignalItem`. Never feed a `SafetyEventItem` into
 * `aggregateLifeDomains`/`aggregateArchetypes`, never run it through
 * `twin/classify_signal`, never let it contribute to the Alignment Score
 * (`lib/alignment-score.ts`) or any other Twin/Growth Tracker aggregate.
 * If a future change needs safety data to influence any of those, that is
 * a new product decision requiring its own ADR, not an assumed extension
 * of this schema's purpose.
 *
 * No `content`/`EncryptedBlob` field on purpose — this item never stores
 * the user's actual message text, only the classification result and
 * enough structural metadata to route/audit it. The raw text that
 * triggered a given classification lives only in the normal
 * `SessionMessageItem`/Room-step content it already belonged to (subject to
 * that surface's own retention), not duplicated here.
 */
export const SafetyEventItemSchema = z.object({
  pk: z.string(),
  sk: z.string(), // Sk.safetyEvent(eventId)
  eventId: z.string(),
  sourceSurface: SafetySourceSurfaceSchema,
  sourceSessionId: z.string(),
  safetyState: SafetyStateSchema,
  confidence: z.number().min(0).max(1),
  reasonCodes: z.array(z.string()),
  requiresHumanSupport: z.boolean(),
  suspendDeepWork: z.boolean(),
  createdAt: z.string().datetime(),
  ttl: z.number().int().positive(), // epoch seconds
})
export type SafetyEventItem = z.infer<typeof SafetyEventItemSchema>

/** What `classifySafety()` (lib/safety.ts) returns to its caller — the same shape Appendix C's minimum contract defines, minus the persistence-only fields (pk/sk/eventId/ttl). */
export const SafetyClassificationSchema = z.object({
  safetyState: SafetyStateSchema,
  confidence: z.number().min(0).max(1),
  reasonCodes: z.array(z.string()),
  requiresHumanSupport: z.boolean(),
  suspendDeepWork: z.boolean(),
  localeSupportNeeded: z.boolean(),
})
export type SafetyClassification = z.infer<typeof SafetyClassificationSchema>
