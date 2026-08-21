import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, type LibraryTopicAliasItem, type LibraryTopicVersionItem } from '@dpnr/shared-types'

export interface ActiveLibraryTopic {
  slug: string
  title: string
  taxonomyCategory: string
}

/**
 * Every active Library topic (slug + title + taxonomy) — extracted from
 * library/topics.ts so Companion's topic-routing directive
 * (companion/message.ts) can share the exact same "what's actually
 * routable" read, rather than a second, possibly-stale copy of this logic.
 * A new topic becomes routable from both places the moment it's seeded.
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

  const versionResults = await Promise.all(
    aliasItems.map((alias) =>
      ddb.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: alias.pk, sk: GlobalKeys.promptVersion(alias.version) },
        })
      )
    )
  )

  return versionResults
    .map((r) => r.Item as LibraryTopicVersionItem | undefined)
    .filter((item): item is LibraryTopicVersionItem => item !== undefined && item.status === 'active')
    .map((item) => ({
      slug: item.pk.replace('LIBRARY#TOPIC#', ''),
      title: item.title,
      taxonomyCategory: item.taxonomyCategory,
    }))
}
