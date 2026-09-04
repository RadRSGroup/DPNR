import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  LifeDomainCategorySchema,
  ArchetypeSchema,
  SignalDirectionSchema,
  type TwinSignalItem,
  type LifeDomainCategory,
  type Archetype,
  type SignalDirection,
} from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'

/** Bounded fetch, same "up to 5" precedent library/topic-detail.ts already established. */
const MAX_PRIOR_SIGNALS = 5

/**
 * Finds up to `MAX_PRIOR_SIGNALS` other `confirmed` signals in the same
 * domain, most-recently-updated first — the comparison basis `direction`
 * needs (Intelligence Spec §7). Same "query the whole TWIN#SIGNAL# prefix,
 * filter in JS" approach twin/helpers.ts::findSignalById and twin/list.ts
 * already use — fine at MVP signal-count scale, no new index.
 */
async function findPriorConfirmedSignalsInDomain(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  signal: TwinSignalItem
): Promise<TwinSignalItem[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': signal.pk, ':prefix': 'TWIN#SIGNAL#' },
    })
  )
  return ((result.Items ?? []) as TwinSignalItem[])
    .filter((s) => s.domain === signal.domain && s.status === 'confirmed' && s.signalId !== signal.signalId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PRIOR_SIGNALS)
}

/**
 * Called from twin/confirm.ts right after a signal moves candidate→confirmed
 * — the same trigger point roadmap/revise already uses (Session 16),
 * reused here at the user's own direct choice of trigger for this feature
 * too (Session 19). Tags the signal with a life-domain + archetype so
 * Dashboard's real Life Domains/Leading Archetypes aggregates have
 * something to aggregate.
 *
 * Never throws — same best-effort convention as
 * lib/roadmap-revision.ts/maybeProposeRoadmapRevision. A classification
 * failure must never block the confirm action itself; the signal simply
 * stays unclassified (absent from both aggregates) until re-confirmed.
 */
export async function maybeClassifySignal(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  promptRegistryTableName: string,
  signal: TwinSignalItem,
  crypto: SessionCrypto
): Promise<void> {
  try {
    const { description } = await crypto.decryptField<{ description: string }>(signal.content)

    const priorSignals = await findPriorConfirmedSignalsInDomain(ddb, tableName, signal)
    const priorDescriptions = await Promise.all(
      priorSignals.map(async (s) => (await crypto.decryptField<{ description: string }>(s.content)).description)
    )
    const priorSignalsInDomain =
      priorDescriptions.length > 0
        ? priorDescriptions.map((d) => `- ${d}`).join('\n')
        : '(none — this is the first confirmed signal in this domain)'

    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'twin', 'classify_signal')
    const result = await callPromptModel(version, {
      signalDomain: signal.domain,
      signalDescription: description,
      priorSignalsInDomain,
    })
    if (typeof result === 'string') return

    const lifeDomainParse = LifeDomainCategorySchema.safeParse(result.lifeDomain)
    const archetypeParse = ArchetypeSchema.safeParse(result.archetype)
    const directionParse = SignalDirectionSchema.safeParse(result.direction)
    const strengthParse =
      typeof result.strength === 'number' && result.strength >= 0 && result.strength <= 1
        ? { success: true as const, data: result.strength }
        : { success: false as const }
    if (!lifeDomainParse.success || !archetypeParse.success) return

    const lifeDomain: LifeDomainCategory = lifeDomainParse.data
    const archetype: Archetype = archetypeParse.data

    const setClauses = ['lifeDomain = :lifeDomain', 'archetype = :archetype']
    const values: Record<string, LifeDomainCategory | Archetype | SignalDirection | number> = {
      ':lifeDomain': lifeDomain,
      ':archetype': archetype,
    }
    // direction/strength are best-effort on top of the always-required
    // lifeDomain/archetype pair above — a malformed value for either just
    // means this confirm doesn't get them yet, not a failed classification.
    if (directionParse.success) {
      setClauses.push('direction = :direction')
      values[':direction'] = directionParse.data
    }
    if (strengthParse.success) {
      setClauses.push('strength = :strength')
      values[':strength'] = strengthParse.data
    }

    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: signal.pk, sk: signal.sk },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeValues: values,
      })
    )
  } catch (err) {
    // Log only a generic message — never model output or signal content,
    // per the "no raw payloads in logs" guardrail.
    console.error('Signal classification failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
