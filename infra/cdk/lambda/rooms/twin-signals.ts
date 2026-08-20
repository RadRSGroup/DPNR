import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type TwinSignalItem, type TwinSignalSource } from '@dpnr/shared-types'
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
): Promise<void> {
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
    }
  } catch (err) {
    // Never let Twin extraction fail the room's own completion. Log only a
    // generic message — never the model result or session summary, per the
    // "no raw payloads in logs" guardrail.
    console.error('Twin signal extraction failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
