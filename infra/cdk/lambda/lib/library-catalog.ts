import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { BatchGetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, type LibraryTopicAliasItem, type LibraryTopicVersionItem } from '@dpnr/shared-types'

export interface ActiveLibraryTopic {
  slug: string
  title: string
  exploreTheme: LibraryTopicVersionItem['exploreTheme']
  lifeDomains: string[]
  level?: LibraryTopicVersionItem['level']
}

// DynamoDB's own BatchGetItem limit — 100 keys per table per request.
const BATCH_GET_LIMIT = 100

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Every active Library topic (slug + title + taxonomy) — extracted from
 * library/topics.ts so Companion's topic-routing directive
 * (companion/message.ts) can share the exact same "what's actually
 * routable" read, rather than a second, possibly-stale copy of this logic.
 * A new topic becomes routable from both places the moment it's seeded.
 *
 * Batched, not N individual `GetCommand`s — the Content Library Master
 * Architecture v2 redesign grew the real catalog from 6 to 54+ topics, and
 * `LibraryTopicsFn` has no explicit Lambda timeout (defaults to 3s, per
 * api-stack.ts) — real-world testing right after that migration's deploy
 * showed the old N-individual-GetCommand version reliably timing out at
 * exactly 3000ms against the real, larger catalog, a regression this fix
 * closes at the read-pattern level rather than by just raising the timeout.
 */
export async function listActiveTopics(
  ddb: DynamoDBDocumentClient,
  tableName: string
): Promise<ActiveLibraryTopic[]> {
  const scanResult = await ddb.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'sk = :prodAlias',
      ExpressionAttributeValues: { ':prodAlias': GlobalKeys.promptAlias('prod') },
    })
  )
  const aliasItems = (scanResult.Items ?? []) as LibraryTopicAliasItem[]
  if (aliasItems.length === 0) return []

  const versionItems: LibraryTopicVersionItem[] = []
  for (const batch of chunk(aliasItems, BATCH_GET_LIMIT)) {
    const result = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: batch.map((alias) => ({ pk: alias.pk, sk: GlobalKeys.promptVersion(alias.version) })),
          },
        },
      })
    )
    versionItems.push(...((result.Responses?.[tableName] ?? []) as LibraryTopicVersionItem[]))
  }

  return versionItems
    .filter((item) => item.status === 'active')
    .map((item) => ({
      slug: item.pk.replace('LIBRARY#TOPIC#', ''),
      title: item.title,
      exploreTheme: item.exploreTheme,
      lifeDomains: item.lifeDomains,
      level: item.level,
    }))
}
