import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  LifeDomainCategorySchema,
  ArchetypeSchema,
  type TwinSignalItem,
  type LifeDomainCategory,
  type Archetype,
} from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'

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

    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'twin', 'classify_signal')
    const result = await callPromptModel(version, {
      signalDomain: signal.domain,
      signalDescription: description,
    })
    if (typeof result === 'string') return

    const lifeDomainParse = LifeDomainCategorySchema.safeParse(result.lifeDomain)
    const archetypeParse = ArchetypeSchema.safeParse(result.archetype)
    if (!lifeDomainParse.success || !archetypeParse.success) return

    const lifeDomain: LifeDomainCategory = lifeDomainParse.data
    const archetype: Archetype = archetypeParse.data

    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: signal.pk, sk: signal.sk },
        UpdateExpression: 'SET lifeDomain = :lifeDomain, archetype = :archetype',
        ExpressionAttributeValues: { ':lifeDomain': lifeDomain, ':archetype': archetype },
      })
    )
  } catch (err) {
    // Log only a generic message — never model output or signal content,
    // per the "no raw payloads in logs" guardrail.
    console.error('Signal classification failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
