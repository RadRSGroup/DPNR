/**
 * Loads the Companion "Pull a Card" library seed data
 * (guidance-cards.seed.ts) into the deployed `dpnr-library-catalog`
 * DynamoDB table — same table Library topics live in, same flat
 * `PK: GUIDANCE_CARD#<id>` / `SK: CONFIG` shape as Plans (no
 * version/alias split: a card has no draft-review lifecycle, just
 * active/inactive).
 *
 * Run manually after `cdk deploy Dpnr-Data` (or whenever
 * guidance-cards.seed.ts changes):
 *
 *   cd infra/cdk
 *   AWS_REGION=<region> npm run seed:guidance-cards
 *
 * Safe to re-run: each PutCommand overwrites the same pk/sk deterministically.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, GuidanceCardItemSchema, type GuidanceCardItem } from '@dpnr/shared-types'
import { GUIDANCE_CARD_SEEDS } from './guidance-cards.seed'

const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME ?? 'dpnr-library-catalog'
const PLACEHOLDER_IMAGE = '/images/companion/pull-a-card.webp'

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  let count = 0

  for (const card of GUIDANCE_CARD_SEEDS) {
    const item: GuidanceCardItem = GuidanceCardItemSchema.parse({
      pk: GlobalKeys.guidanceCardPk(card.cardId),
      sk: 'CONFIG',
      text: card.text,
      imageRef: PLACEHOLDER_IMAGE,
      source: 'manual',
      active: true,
      createdAt: new Date().toISOString(),
    })

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
    count++
    console.log(`Seeded guidance card "${card.cardId}"`)
  }

  console.log(`Done: ${count} guidance cards seeded into ${TABLE_NAME}.`)
}

main().catch((err) => {
  console.error('Guidance cards seed failed:', err)
  process.exit(1)
})
