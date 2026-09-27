import { PutCommand, QueryCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  LIFE_DOMAIN_LABELS,
  type LifeDomainCategory,
  type LifeDomainSummaryItem,
  type TwinSignalItem,
} from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'

/** Most recent confirmed signals in the domain given to the model. */
const MAX_ITEMS = 8

/**
 * Regenerates one life domain's short status summary (founder feedback
 * 2026-09-27: "each active Life Domain should offer a short intelligent
 * status summary… use only supported existing evidence"). Called from
 * twin/confirm.ts after the confirmed signal has been classified into
 * `domain`. Confirmed signals only; stored encrypted; the Dashboard shows it
 * on tap/hover next to the domain's existing share-of-confirmed percent.
 *
 * Never throws: like classification, a failure must not block confirming.
 */
export async function refreshDomainSummary(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  promptRegistryTableName: string,
  pk: string,
  domain: LifeDomainCategory,
  crypto: SessionCrypto,
  languageInstruction: string
): Promise<void> {
  try {
    const items: TwinSignalItem[] = []
    let start: Record<string, unknown> | undefined
    do {
      const res = await ddb.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' },
          ExclusiveStartKey: start,
        })
      )
      items.push(...((res.Items ?? []) as TwinSignalItem[]))
      start = res.LastEvaluatedKey
    } while (start)

    const inDomain = items
      .filter((s) => s.status === 'confirmed' && s.lifeDomain === domain)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    if (inDomain.length === 0) return

    const lines = await Promise.all(
      inDomain.slice(0, MAX_ITEMS).map(async (s) => {
        const { description, name } = await crypto.decryptField<{ description: string; name?: string }>(s.content)
        return name ? `- ${name}: ${description}` : `- ${description}`
      })
    )

    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'twin', 'domain_summary')
    const result = await callPromptModel(version, {
      lifeDomain: LIFE_DOMAIN_LABELS[domain],
      confirmedItems: lines.join('\n'),
      languageInstruction,
    })
    const summary = typeof result === 'string' ? result.trim() : ''
    if (!summary) return

    const item: LifeDomainSummaryItem = {
      pk,
      sk: Sk.lifeDomainSummary(domain),
      domain,
      content: await crypto.encryptField({ summary: summary.slice(0, 600) }),
      basedOnSignals: inDomain.length,
      updatedAt: new Date().toISOString(),
    }
    await ddb.send(new PutCommand({ TableName: tableName, Item: item }))
  } catch (err) {
    // Generic message only — never model output or signal content in logs.
    console.error('Life domain summary failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
