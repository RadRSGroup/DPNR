/**
 * Loads the Prompt Registry seed data (currently just decision-room-prompts.seed.ts
 * — the only domain that's an actual port of already-shipped prompts; every
 * other domain in MVP_ARCHITECTURE.md §3.2 is net-new and gets seeded once
 * it's actually built, not speculatively) into the deployed
 * `dpnr-prompt-registry` DynamoDB table.
 *
 * NOT run as part of this session — there is no AWS account yet
 * (docs/AGENT_LOG.md). Run manually after `cdk deploy Dpnr-Data` succeeds:
 *
 *   cd infra/cdk
 *   AWS_REGION=<region> npm run seed:prompt-registry
 *
 * Writes version 1 of every prompt with status 'active' and immediately
 * points the 'prod' alias at it — there's no prior prod version to
 * preserve continuity with, so there's nothing to stage a canary against
 * yet. Safe to re-run: each PutCommand overwrites the same pk/sk
 * deterministically (no ConditionExpression) since this is a one-time
 * migration load, not an accretive write path — do not reuse this
 * script's unconditional-overwrite pattern for a real publish flow later.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  PromptVersionItemSchema,
  PromptAliasItemSchema,
  type PromptVersionItem,
  type PromptAliasItem,
} from '@dpnr/shared-types'
import { DECISION_ROOM_PROMPT_SEEDS, type PromptSeed } from './decision-room-prompts.seed'

const TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME ?? 'dpnr-prompt-registry'

const DOMAINS: { domain: string; seeds: PromptSeed[] }[] = [
  { domain: 'decision_room', seeds: DECISION_ROOM_PROMPT_SEEDS },
]

function buildVersionItem(domain: string, seed: PromptSeed, now: string): PromptVersionItem {
  return PromptVersionItemSchema.parse({
    pk: GlobalKeys.promptRegistryPk(domain, seed.name),
    sk: GlobalKeys.promptVersion(1),
    systemTemplate: seed.systemTemplate,
    userTemplate: seed.userTemplate,
    variables: seed.variables,
    modelParams: {
      // Ported from apps/web/src/lib/ai/call.ts verbatim — NOT yet
      // re-validated against Claude/Bedrock (MVP_ARCHITECTURE.md §5.3).
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: seed.outputSchema ? 600 : 500, // matches aiCallJSON vs aiCall's limits
    },
    outputSchema: seed.outputSchema,
    status: 'active',
    createdAt: now,
    author: 'migration:decision-room-prompts',
    changelog: seed.notes
      ? `Ported from apps/web/src/lib/ai/prompts.ts. ${seed.notes}`
      : 'Ported from apps/web/src/lib/ai/prompts.ts.',
  })
}

function buildAliasItem(domain: string, name: string, now: string): PromptAliasItem {
  return PromptAliasItemSchema.parse({
    pk: GlobalKeys.promptRegistryPk(domain, name),
    sk: GlobalKeys.promptAlias('prod'),
    version: 1,
    updatedAt: now,
  })
}

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const now = new Date().toISOString()
  let count = 0

  for (const { domain, seeds } of DOMAINS) {
    for (const seed of seeds) {
      const versionItem = buildVersionItem(domain, seed, now)
      const aliasItem = buildAliasItem(domain, seed.name, now)

      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: versionItem }))
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: aliasItem }))
      count++
      console.log(`Seeded ${domain}/${seed.name}@v1 (+ prod alias)`)
    }
  }

  console.log(`Done: ${count} prompts seeded into ${TABLE_NAME}.`)
}

main().catch((err) => {
  console.error('Prompt Registry seed failed:', err)
  process.exit(1)
})
