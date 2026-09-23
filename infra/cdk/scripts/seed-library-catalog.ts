/**
 * Loads the Content Library catalog seed data into the deployed
 * `dpnr-library-catalog` DynamoDB table, mirroring seed-prompt-registry.ts's
 * version+alias pattern exactly (same VERSION#/ALIAS# convention, same
 * GlobalKeys helpers, same "prod" alias pointed at version 1 immediately
 * since there's nothing to canary against yet).
 *
 * Seeds `LIBRARY_TOPIC_SEEDS_V2` (library-topics-v2.seed.ts, 58 topics —
 * see that file's own doc comment for provenance) and retires the original
 * 6-topic catalog (`library-topics.seed.ts`, kept in git as a historical
 * record, no longer imported here) by flipping each of its slugs'
 * VERSION#1 item to `status: 'retired'` rather than deleting it —
 * `listActiveTopics` (lib/library-catalog.ts) already filters on
 * `status === 'active'`, so a retired topic simply stops appearing without
 * losing its DynamoDB history.
 *
 * Run manually after `cdk deploy Dpnr-Data` succeeds:
 *
 *   cd infra/cdk
 *   AWS_REGION=<region> npm run seed:library-catalog
 *
 * Safe to re-run: each PutCommand overwrites the same pk/sk
 * deterministically, same caveat as seed-prompt-registry.ts (a one-time
 * migration load, not an accretive publish flow). The retirement step is
 * also idempotent — updating an already-retired item's status to
 * 'retired' again is a no-op.
 *
 * Adding topics without rewriting the rest (Session 65): set ONLY_SLUGS to
 * a comma-separated slug list to seed just those topics (the retirement
 * step is skipped in that mode), and DRY_RUN=1 to print what would be
 * written without touching the table:
 *
 *   ONLY_SLUGS=self-love,abundance DRY_RUN=1 npm run seed:library-catalog
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  LibraryTopicVersionItemSchema,
  LibraryTopicAliasItemSchema,
  type LibraryTopicVersionItem,
  type LibraryTopicAliasItem,
} from '@dpnr/shared-types'
import { LIBRARY_TOPIC_SEEDS_V2, RETIRED_TOPIC_SLUGS } from './library-topics-v2.seed'

const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME ?? 'dpnr-library-catalog'
const ONLY_SLUGS = process.env.ONLY_SLUGS?.split(',').map((s) => s.trim()).filter(Boolean)
const DRY_RUN = process.env.DRY_RUN === '1'

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const now = new Date().toISOString()
  let count = 0

  let topics = LIBRARY_TOPIC_SEEDS_V2
  if (ONLY_SLUGS) {
    const unknown = ONLY_SLUGS.filter((slug) => !topics.some((t) => t.slug === slug))
    if (unknown.length > 0) throw new Error(`ONLY_SLUGS has slugs not in the seed file: ${unknown.join(', ')}`)
    topics = topics.filter((t) => ONLY_SLUGS.includes(t.slug))
  }

  for (const topic of topics) {
    const pk = GlobalKeys.libraryTopicPk(topic.slug)

    const versionItem: LibraryTopicVersionItem = LibraryTopicVersionItemSchema.parse({
      pk,
      sk: GlobalKeys.promptVersion(1),
      exploreTheme: topic.exploreTheme,
      lifeDomains: topic.lifeDomains,
      level: topic.level,
      contentType: topic.contentType,
      relatedTopics: topic.relatedTopics,
      title: topic.title,
      body: topic.body,
      expandTheLens: topic.expandTheLens,
      howItMayShowUp: topic.howItMayShowUp,
      reflectionQuestions: topic.reflectionQuestions,
      waysToWorkWithIt: topic.waysToWorkWithIt,
      goDeeperGuidance: topic.goDeeperGuidance,
      status: 'active',
      createdAt: now,
    })
    const aliasItem: LibraryTopicAliasItem = LibraryTopicAliasItemSchema.parse({
      pk,
      sk: GlobalKeys.promptAlias('prod'),
      version: 1,
      updatedAt: now,
    })

    if (DRY_RUN) {
      console.log(`[dry run] would write ${pk} ${versionItem.sk} (${versionItem.exploreTheme}, "${versionItem.title}") + ${aliasItem.sk} -> v1`)
      count++
      continue
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: versionItem }))
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: aliasItem }))
    count++
    console.log(`Seeded topic "${topic.slug}"@v1 (+ prod alias)`)
  }

  console.log(`Done: ${count} topics ${DRY_RUN ? 'checked (dry run, nothing written)' : 'seeded'} into ${TABLE_NAME}.`)
  if (ONLY_SLUGS || DRY_RUN) return

  let retiredCount = 0
  for (const slug of RETIRED_TOPIC_SLUGS) {
    const pk = GlobalKeys.libraryTopicPk(slug)
    const aliasResult = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: GlobalKeys.promptAlias('prod') } })
    )
    const aliasItem = aliasResult.Item as LibraryTopicAliasItem | undefined
    if (!aliasItem) {
      console.log(`Skipping retirement of "${slug}" — no prod alias found (already gone, or never deployed).`)
      continue
    }
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: GlobalKeys.promptVersion(aliasItem.version) },
        UpdateExpression: 'SET #status = :retired',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':retired': 'retired' },
      })
    )
    retiredCount++
    console.log(`Retired topic "${slug}"`)
  }
  console.log(`Done: ${retiredCount} old topics retired.`)
}

main().catch((err) => {
  console.error('Library catalog seed failed:', err)
  process.exit(1)
})
