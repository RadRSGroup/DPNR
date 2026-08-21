import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type TwinSignalItem, type TwinSignalSource, type SessionSummaryItem } from '@dpnr/shared-types'
import { stubEncryptField } from '../lib/crypto-stub'
import { resolvePromptVersion } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'

const EXTRACTABLE_DOMAINS = new Set(['pattern', 'trigger', 'value', 'commitment'])
/** Signals below this confidence are almost certainly noise — not worth writing at all, per the spec's "only strong signals should update the Digital Twin." */
const MIN_CONFIDENCE_TO_WRITE = 0.5

/**
 * Runs the `twin/extract_signals` prompt over one completed session's
 * plain-text summary and writes any resulting signals as `candidate`
 * `TwinSignalItem`s (spec §5 "Signal model"/"Trust rules" — candidates need
 * explicit user confirm/reject before they count as real, via
 * `POST /v1/twin/signals/{id}/confirm|reject`).
 *
 * Deliberately never throws — called from `COMMITMENT` in both
 * `decision-steps/` and `mirror-steps/`, and a Twin-extraction failure must
 * never block the actual room finishing (the spec's own intelligence rules
 * treat this as enrichment, not a required step). Errors are swallowed
 * after a generic, no-raw-content log line, same convention as every other
 * best-effort AI call in this codebase (e.g. library/topic-detail.ts's
 * personalization).
 */
export async function extractCandidateSignals(
  pk: string,
  sessionId: string,
  source: TwinSignalSource,
  roomType: 'Decision Room' | 'Mirror Room',
  sessionSummary: string
): Promise<string[]> {
  const writtenSignalIds: string[] = []
  try {
    const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'twin', 'extract_signals')
    const result = await callPromptModel(version, { roomType, sessionSummary })
    const signals = typeof result === 'string' ? [] : (result.signals as unknown[] | undefined) ?? []

    const now = new Date().toISOString()
    for (const raw of signals) {
      const signal = raw as { domain?: string; description?: string; confidence?: number }
      if (
        !signal.domain ||
        !EXTRACTABLE_DOMAINS.has(signal.domain) ||
        typeof signal.description !== 'string' ||
        !signal.description.trim() ||
        typeof signal.confidence !== 'number' ||
        signal.confidence < MIN_CONFIDENCE_TO_WRITE
      ) {
        continue // silently skip a malformed or low-confidence entry rather than fail the whole batch
      }

      const signalId = randomUUID()
      const item: TwinSignalItem = {
        pk,
        sk: Sk.twinSignal(signal.domain, signalId),
        signalId,
        domain: signal.domain as TwinSignalItem['domain'],
        status: 'candidate',
        confidence: signal.confidence,
        source,
        sourceSessionId: sessionId,
        content: stubEncryptField({ description: signal.description }),
        createdAt: now,
        updatedAt: now,
      }
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
      writtenSignalIds.push(signalId)
    }
  } catch (err) {
    // Never let Twin extraction fail the room's own completion. Log only a
    // generic message — never the model result or session summary, per the
    // "no raw payloads in logs" guardrail.
    console.error('Twin signal extraction failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
  return writtenSignalIds
}

/**
 * Persists the same plain-text summary `extractCandidateSignals` was just
 * given as a real `SESSION#<id>#SUMMARY` item — closing a real gap:
 * `SessionSummaryItem` (`dynamo/session.ts`) has existed since early
 * sessions but nothing ever actually wrote one; Daily Card/Weekly Recap
 * composition (`continuity/compose-*.ts`) need real stored summaries to
 * read, not just Twin signals, per `MVP_ARCHITECTURE.md` §5.7/§6.
 *
 * `promptRef` isn't a real Prompt Registry reference here — this summary is
 * hand-assembled from session fields (see each `commitment.ts` caller), not
 * AI-generated — so it uses an `inline:` marker rather than a fabricated
 * `domain/name@vN` string, so a reader of this field never mistakes it for
 * a real registry lookup key.
 *
 * Same never-throws convention as `extractCandidateSignals` — a summary
 * write failing must not block the room finishing either.
 */
export async function persistSessionSummary(
  pk: string,
  sessionId: string,
  summary: string,
  candidateSignalIds: string[],
  inlineRef: string
): Promise<void> {
  try {
    const item: SessionSummaryItem = {
      pk,
      sk: Sk.sessionSummary(sessionId),
      content: stubEncryptField({ summary, candidateSignalIds }),
      promptRef: `inline:${inlineRef}`,
      createdAt: new Date().toISOString(),
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  } catch (err) {
    console.error('Session summary persist failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
