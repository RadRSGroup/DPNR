import { GetCommand, QueryCommand, UpdateCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  REFERENCE_PATTERN_NAMES,
  Sk,
  type DailyCardItem,
  type EncryptedBlob,
  type GenderIdentity,
  type LifeDomainSummaryItem,
  type PromptVersionItem,
  type RoadmapItem,
  type TranslatedContent,
  type TwinSignalItem,
  type WeeklyRecapItem,
} from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import { toLanguageInstruction, type Locale } from './locale'
import { textLanguage } from './localized-content'
import { isoWeekString } from './iso-week'

/**
 * Relocalization (2026-09-29): after a person switches the app language,
 * translate the AI-written text already stored for them and keep it next to
 * the original as `translated` (see lib/localized-content.ts for the read
 * side). Covers today's Daily Card, this week's Weekly Recap, the Life
 * Domain summaries, the Roadmap and every non-rejected Twin insight. The
 * person's own words and past room sessions are never translated (user
 * decision: those stay as written).
 *
 * Idempotent: an item already in the target language, or already carrying
 * a translation into it, is skipped, so running this twice costs nothing.
 * Each write is conditional on the item's timestamp being unchanged since it
 * was read, so a translation never lands on newer content.
 */

type Kind = 'daily_card' | 'weekly_recap' | 'domain_summary' | 'roadmap' | 'insight'

export interface Candidate {
  id: string
  kind: Kind
  key: { pk: string; sk: string }
  // The attribute and value the write is conditioned on.
  stampAttr: 'createdAt' | 'updatedAt'
  stampValue: string
  fields: Record<string, string>
  // Fields an existing translation into this language already has right,
  // kept when the translation is rewritten.
  keep: Record<string, string>
  needsReferencePattern: boolean
}

export interface RelocalizeDeps {
  ddb: DynamoDBDocumentClient
  tableName: string
  crypto: SessionCrypto
  translatePrompt: PromptVersionItem
  callModel: (version: PromptVersionItem, vars: Record<string, string>) => Promise<Record<string, unknown> | string>
}

export const BATCH_SIZE = 8
const PARALLEL_BATCHES = 3

/** Only the string fields that are non-empty: what there is to translate. */
function textFields<T extends object>(value: T, keys: (keyof T & string)[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = value[k]
    if (typeof v === 'string' && v.trim()) out[k] = v
  }
  return out
}

async function queryAll<T>(ddb: DynamoDBDocumentClient, tableName: string, pk: string, prefix: string): Promise<T[]> {
  const items: T[] = []
  let start: Record<string, unknown> | undefined
  do {
    const res = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': prefix },
        ExclusiveStartKey: start,
      })
    )
    items.push(...((res.Items ?? []) as T[]))
    start = res.LastEvaluatedKey
  } while (start)
  return items
}

async function getOne<T>(ddb: DynamoDBDocumentClient, tableName: string, pk: string, sk: string): Promise<T | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk } }))
  return res.Item as T | undefined
}

/** Everything stored for `pk` that is not yet readable in `locale`. */
export async function gatherCandidates(deps: RelocalizeDeps, pk: string, locale: Locale, now = new Date()): Promise<Candidate[]> {
  const { ddb, tableName, crypto } = deps
  const today = now.toISOString().slice(0, 10)
  const [card, recap, roadmap, summaries, signals] = await Promise.all([
    getOne<DailyCardItem>(ddb, tableName, pk, Sk.dailyCard(today)),
    getOne<WeeklyRecapItem>(ddb, tableName, pk, Sk.weeklyRecap(isoWeekString(now))),
    getOne<RoadmapItem>(ddb, tableName, pk, Sk.roadmap()),
    queryAll<LifeDomainSummaryItem>(ddb, tableName, pk, 'TWIN#DOMAIN_SUMMARY#'),
    queryAll<TwinSignalItem>(ddb, tableName, pk, 'TWIN#SIGNAL#'),
  ])

  const candidates: Candidate[] = []
  const consider = async (
    item: { pk: string; sk: string; content: EncryptedBlob; translated?: TranslatedContent },
    kind: Kind,
    keys: string[],
    stampAttr: Candidate['stampAttr'],
    stampValue: string,
    needsReferencePattern = false
  ) => {
    let value: Record<string, unknown>
    try {
      value = await crypto.decryptField<Record<string, unknown>>(item.content)
    } catch {
      return // unreadable (e.g. an old key): nothing we can translate
    }
    // Per field, not per item: an older insight can have a Hebrew
    // description but an English name (extraction used to prefer the
    // English reference-pattern names), and only the English field needs work.
    let shown = textFields(value, keys)
    let existing: Record<string, string> = {}
    // An existing translation into `locale` counts, unless the model left a
    // field untranslated (it once kept an English pattern name as is).
    if (item.translated?.lang === locale) {
      try {
        existing = textFields(await crypto.decryptField<Record<string, unknown>>(item.translated.content), keys)
        shown = { ...shown, ...existing }
      } catch {
        // unreadable translation: redo it from the original
      }
    }
    const fields = Object.fromEntries(Object.entries(shown).filter(([, text]) => textLanguage(text) !== locale))
    if (Object.keys(fields).length === 0) return
    // Retranslate from the original text of those fields, not a stale copy.
    for (const k of Object.keys(fields)) {
      const orig = value[k]
      if (typeof orig === 'string') fields[k] = orig
    }
    const keep = Object.fromEntries(Object.entries(existing).filter(([k, text]) => !(k in fields) && textLanguage(text) === locale))
    candidates.push({ id: String(candidates.length), kind, key: { pk: item.pk, sk: item.sk }, stampAttr, stampValue, fields, keep, needsReferencePattern })
  }

  if (card) await consider(card, 'daily_card', ['text'], 'createdAt', card.createdAt)
  if (recap) await consider(recap, 'weekly_recap', ['stoodOut', 'shifted', 'remainsActive', 'suggestion'], 'createdAt', recap.createdAt)
  if (roadmap) await consider(roadmap, 'roadmap', ['currentFocus', 'theme', 'direction'], 'updatedAt', roadmap.updatedAt)
  for (const s of summaries) await consider(s, 'domain_summary', ['summary'], 'updatedAt', s.updatedAt)
  for (const s of signals) {
    if (s.status === 'rejected') continue
    await consider(s, 'insight', ['name', 'description'], 'updatedAt', s.updatedAt, s.domain === 'pattern' && !s.referencePattern)
  }
  return candidates
}

interface TranslatedItem {
  fields: Record<string, string>
  referencePattern?: string
}

/**
 * The model's reply for one batch, keyed by candidate id. An item is kept
 * only when every field sent came back non-empty; anything else is dropped
 * rather than half-translated.
 */
export function parseTranslation(result: Record<string, unknown> | string, batch: Candidate[]): Map<string, TranslatedItem> {
  const out = new Map<string, TranslatedItem>()
  if (typeof result === 'string' || !Array.isArray(result.items)) return out
  const byId = new Map(batch.map((c) => [c.id, c]))
  for (const raw of result.items as unknown[]) {
    if (!raw || typeof raw !== 'object') continue
    const { id, fields, referencePattern } = raw as { id?: unknown; fields?: unknown; referencePattern?: unknown }
    const candidate = typeof id === 'string' ? byId.get(id) : undefined
    if (!candidate || !Array.isArray(fields)) continue
    const translated: Record<string, string> = {}
    for (const f of fields as unknown[]) {
      const { key, text } = (f ?? {}) as { key?: unknown; text?: unknown }
      if (typeof key === 'string' && key in candidate.fields && typeof text === 'string' && text.trim()) translated[key] = text.trim()
    }
    if (Object.keys(translated).length !== Object.keys(candidate.fields).length) continue
    const pattern =
      typeof referencePattern === 'string' && (REFERENCE_PATTERN_NAMES as readonly string[]).includes(referencePattern)
        ? referencePattern
        : undefined
    out.set(candidate.id, { fields: translated, referencePattern: candidate.needsReferencePattern ? pattern : undefined })
  }
  return out
}

async function writeTranslation(deps: RelocalizeDeps, c: Candidate, t: TranslatedItem, locale: Locale): Promise<boolean> {
  const translated: TranslatedContent = { lang: locale, content: await deps.crypto.encryptField({ ...c.keep, ...t.fields }) }
  const names: Record<string, string> = { '#stamp': c.stampAttr }
  const values: Record<string, unknown> = { ':t': translated, ':stamp': c.stampValue }
  let update = 'SET translated = :t'
  if (t.referencePattern) {
    update += ', referencePattern = :rp'
    values[':rp'] = t.referencePattern
  }
  try {
    await deps.ddb.send(
      new UpdateCommand({
        TableName: deps.tableName,
        Key: c.key,
        UpdateExpression: update,
        ConditionExpression: 'attribute_exists(pk) AND #stamp = :stamp',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    )
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') return false // changed meanwhile
    throw err
  }
}

export async function relocalizeUser(
  deps: RelocalizeDeps,
  pk: string,
  locale: Locale,
  gender: GenderIdentity
): Promise<{ candidates: number; written: number; failedBatches: number }> {
  const candidates = await gatherCandidates(deps, pk, locale)
  const batches: Candidate[][] = []
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) batches.push(candidates.slice(i, i + BATCH_SIZE))

  const vars = {
    targetLanguage: locale === 'he' ? 'Hebrew' : 'English',
    languageInstruction: toLanguageInstruction(locale, gender),
  }
  let written = 0
  let failedBatches = 0
  const runBatch = async (batch: Candidate[]) => {
    try {
      const itemsJson = JSON.stringify(batch.map((c) => ({ id: c.id, kind: c.kind, fields: c.fields })))
      const result = await deps.callModel(deps.translatePrompt, { ...vars, itemsJson })
      const parsed = parseTranslation(result, batch)
      for (const c of batch) {
        const t = parsed.get(c.id)
        if (t && (await writeTranslation(deps, c, t, locale))) written++
      }
    } catch (err) {
      failedBatches++
      // Generic message only: never model output or personal content in logs.
      console.error('Relocalize batch failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    }
  }
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    await Promise.all(batches.slice(i, i + PARALLEL_BATCHES).map(runBatch))
  }
  return { candidates: candidates.length, written, failedBatches }
}
