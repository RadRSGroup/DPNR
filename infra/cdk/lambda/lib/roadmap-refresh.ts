import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { Sk, type RoadmapItem } from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'
import { gatherContinuityContext } from '../continuity/gather-context'

type RoadmapContent = { currentFocus: string; theme: string; direction: string; suggestedSpaces: string[] }

/** Most recent sessions passed to the model — enough for the arc, bounded for cost. */
const MAX_SESSIONS = 8
/** Per-session cap: room answers can now be up to 5000 chars each, and the summary concatenates several. */
const MAX_SESSION_CHARS = 1500
const MAX_SIGNALS = 20

const ALLOWED_SPACES = new Set(['Mirror Room', 'Decision Room', 'Library'])

/**
 * Session 68 — keeps the live Roadmap (Dashboard/Growth/Evolution Map
 * "current focus / theme / direction") in step with what the person has
 * actually been working on. Called at the end of every Decision Room and
 * Mirror Room session (both COMMITMENT steps), right after
 * `persistSessionSummary`, so the session just finished is included.
 *
 * Why this exists: before it, the Roadmap was written once at onboarding
 * and only changed via `roadmap-revision.ts` — which needs ≥2 *confirmed*
 * Twin signals, produces a proposal the person must accept, and skips
 * entirely while any proposal is pending. A beta user with three
 * completed decisions (and no signals confirmed) was stuck on her first
 * one. The user chose auto-update over propose-then-accept (Session 68),
 * superseding Session 16's propose-first choice for this trigger; the
 * confirm-signal → proposal path in `roadmap-revision.ts` is unchanged.
 *
 * Writes the Roadmap directly (version + 1), creates one if onboarding
 * never did, and deletes any pending proposal (it was computed from older
 * evidence than this refresh). A paused or archived Roadmap is left alone
 * — the person turned it off deliberately (Intelligence Spec §17).
 *
 * Never throws — same best-effort convention as extractCandidateSignals /
 * persistSessionSummary: a refresh failing must never fail the COMMITMENT.
 */
export async function refreshRoadmapAfterSession(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  promptRegistryTableName: string,
  pk: string,
  crypto: SessionCrypto,
  languageInstruction: string
): Promise<void> {
  try {
    const userId = pk.replace(/^USER#/, '')
    const roadmapResult = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.roadmap() } }))
    const existing = roadmapResult.Item as RoadmapItem | undefined
    if (existing && (existing.lifecycleState === 'paused' || existing.lifecycleState === 'archived')) return

    const { confirmedSignals, sessionSummaries } = await gatherContinuityContext(userId, crypto)
    if (sessionSummaries.length === 0) return

    const current = existing ? await crypto.decryptField<RoadmapContent>(existing.content) : null

    const recentSessions = sessionSummaries
      .slice(0, MAX_SESSIONS)
      .map((s, i) => {
        const text = s.summary.length > MAX_SESSION_CHARS ? `${s.summary.slice(0, MAX_SESSION_CHARS)}…` : s.summary
        return `[${i === 0 ? 'Most recent' : `${i + 1}`} — ${s.createdAt.slice(0, 10)}]\n${text}`
      })
      .join('\n\n')
    const confirmedSignalsText =
      confirmedSignals.length > 0
        ? confirmedSignals.slice(0, MAX_SIGNALS).map((s) => `- (${s.domain}) ${s.description}`).join('\n')
        : '(none confirmed yet)'

    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'roadmap', 'refresh')
    const result = await callPromptModel(version, {
      currentFocus: current?.currentFocus ?? '(none yet)',
      theme: current?.theme ?? '(none yet)',
      direction: current?.direction ?? '(none yet)',
      recentSessions,
      confirmedSignals: confirmedSignalsText,
      languageInstruction,
    })
    if (typeof result === 'string') return

    const currentFocus = typeof result.currentFocus === 'string' ? result.currentFocus.trim() : ''
    const theme = typeof result.theme === 'string' ? result.theme.trim() : ''
    const direction = typeof result.direction === 'string' ? result.direction.trim() : ''
    if (!currentFocus || !theme || !direction) return
    const suggestedSpaces = Array.isArray(result.suggestedSpaces)
      ? result.suggestedSpaces.filter((s): s is string => typeof s === 'string' && ALLOWED_SPACES.has(s)).slice(0, 2)
      : []

    const item: RoadmapItem = {
      pk,
      sk: Sk.roadmap(),
      content: await crypto.encryptField<RoadmapContent>({ currentFocus, theme, direction, suggestedSpaces }),
      version: (existing?.version ?? 0) + 1,
      // 'evolving' only meant "a proposal is pending" — that proposal is
      // superseded (deleted) below, so the refreshed Roadmap is 'active'.
      lifecycleState: 'active',
      updatedAt: new Date().toISOString(),
    }
    await Promise.all([
      ddb.send(new PutCommand({ TableName: tableName, Item: item })),
      ddb.send(new DeleteCommand({ TableName: tableName, Key: { pk, sk: Sk.roadmapProposal() } })),
    ])
  } catch (err) {
    // Generic message only — never model output or session content.
    console.error('Roadmap refresh failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
