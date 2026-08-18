/**
 * Loads the Content Library catalog seed data (library-topics.seed.ts)
 * into the deployed `dpnr-library-catalog` DynamoDB table, mirroring
 * seed-prompt-registry.ts's version+alias pattern exactly (same
 * VERSION#/ALIAS# convention, same GlobalKeys helpers, same "prod" alias
 * pointed at version 1 immediately since there's nothing to canary
 * against yet).
 *
 * NOT run as part of this session — there is no AWS account yet
 * (docs/AGENT_LOG.md). Run manually after `cdk deploy Dpnr-Data` succeeds:
 *
 *   cd infra/cdk
 *   AWS_REGION=<region> npm run seed:library-catalog
 *
 * Safe to re-run: each PutCommand overwrites the same pk/sk
 * deterministically, same caveat as seed-prompt-registry.ts (a one-time
 * migration load, not an accretive publish flow).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  LibraryTopicVersionItemSchema,
  LibraryTopicAliasItemSchema,
  type LibraryTopicVersionItem,
  type LibraryTopicAliasItem,
} from '@dpnr/shared-types'
import { LIBRARY_TOPIC_SEEDS } from './library-topics.seed'

const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME ?? 'dpnr-library-catalog'

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const now = new Date().toISOString()
  let count = 0

  for (const topic of LIBRARY_TOPIC_SEEDS) {
    const pk = GlobalKeys.libraryTopicPk(topic.slug)

    const versionItem: LibraryTopicVersionItem = LibraryTopicVersionItemSchema.parse({
      pk,
      sk: GlobalKeys.promptVersion(1),
      taxonomyCategory: topic.taxonomyCategory,
      title: topic.title,
      body: topic.body,
      status: 'active',
      createdAt: now,
    })
    const aliasItem: LibraryTopicAliasItem = LibraryTopicAliasItemSchema.parse({
      pk,
      sk: GlobalKeys.promptAlias('prod'),
      version: 1,
      updatedAt: now,
    })

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: versionItem }))
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: aliasItem }))
    count++
    console.log(`Seeded topic "${topic.slug}"@v1 (+ prod alias)`)
  }

  console.log(`Done: ${count} topics seeded into ${TABLE_NAME}.`)
}

main().catch((err) => {
  console.error('Library catalog seed failed:', err)
  process.exit(1)
})
