/**
 * Loads the Prompt Registry seed data into the deployed
 * `dpnr-prompt-registry` DynamoDB table. Three domains so far:
 * `decision_room` (an actual port of already-shipped OpenAI prompts),
 * `mirror_room`, and `library` (both net-new, designed Claude-native from
 * day one — see each seed file's own doc comment). Every other domain in
 * MVP_ARCHITECTURE.md §3.2 gets seeded once it's actually built, not
 * speculatively.
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
import { MIRROR_ROOM_PROMPT_SEEDS } from './mirror-room-prompts.seed'
import { LIBRARY_PROMPT_SEEDS } from './library-prompts.seed'
import { TWIN_PROMPT_SEEDS } from './twin-prompts.seed'
import { DAILY_CARD_PROMPT_SEEDS } from './daily-card-prompts.seed'
import { WEEKLY_RECAP_PROMPT_SEEDS } from './weekly-recap-prompts.seed'
import { COMPANION_PROMPT_SEEDS } from './companion-prompts.seed'

const TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME ?? 'dpnr-prompt-registry'

const DOMAINS: { domain: string; seeds: PromptSeed[]; author: string; sourceNote: string }[] = [
  {
    domain: 'decision_room',
    seeds: DECISION_ROOM_PROMPT_SEEDS,
    author: 'migration:decision-room-prompts',
    sourceNote: 'Ported from apps/web/src/lib/ai/prompts.ts.',
  },
  {
    domain: 'mirror_room',
    seeds: MIRROR_ROOM_PROMPT_SEEDS,
    author: 'design:mirror-room-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see mirror-room-prompts.seed.ts).',
  },
  {
    domain: 'library',
    seeds: LIBRARY_PROMPT_SEEDS,
    author: 'design:library-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see library-prompts.seed.ts).',
  },
  {
    domain: 'twin',
    seeds: TWIN_PROMPT_SEEDS,
    author: 'design:twin-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see twin-prompts.seed.ts).',
  },
  {
    domain: 'daily_card',
    seeds: DAILY_CARD_PROMPT_SEEDS,
    author: 'design:daily-card-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see daily-card-prompts.seed.ts).',
  },
  {
    domain: 'weekly_recap',
    seeds: WEEKLY_RECAP_PROMPT_SEEDS,
    author: 'design:weekly-recap-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see weekly-recap-prompts.seed.ts).',
  },
  {
    domain: 'companion',
    seeds: COMPANION_PROMPT_SEEDS,
    author: 'design:companion-prompts',
    sourceNote: 'Net-new — designed Claude-native, not ported from anywhere (see companion-prompts.seed.ts).',
  },
]

function buildVersionItem(
  domain: string,
  seed: PromptSeed,
  now: string,
  author: string,
  sourceNote: string
): PromptVersionItem {
  return PromptVersionItemSchema.parse({
    pk: GlobalKeys.promptRegistryPk(domain, seed.name),
    sk: GlobalKeys.promptVersion(1),
    systemTemplate: seed.systemTemplate,
    userTemplate: seed.userTemplate,
    variables: seed.variables,
    modelParams: {
      // Confirmed LIVE against real Bedrock access in us-east-1, Session 7 —
      // no longer an unconfirmed placeholder. The bare model id
      // ('anthropic.claude-sonnet-4-5-20250929-v1:0') returns a
      // ValidationException on Converse ("on-demand throughput isn't
      // supported... retry with an inference profile") — Bedrock requires
      // the region-prefixed inference profile id for on-demand invocation
      // of this model. Verified with a real `aws bedrock-runtime converse`
      // call, not just `list-foundation-models` (which lists the catalog,
      // not actual invokability). `anthropic.claude-sonnet-5` is also in
      // this account's catalog but returned AccessDeniedException — not
      // yet granted for this account; request it in the Bedrock console's
      // Model access page if/when upgrading past 4.5, then re-verify with
      // the same converse-call method before changing this value.
      model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      temperature: 0.7,
      maxTokens: seed.outputSchema ? 600 : 500, // matches aiCallJSON vs aiCall's limits — unchanged, no evidence Claude needs more headroom here
    },
    outputSchema: seed.outputSchema,
    status: 'active',
    createdAt: now,
    author,
    changelog: seed.notes ? `${sourceNote} ${seed.notes}` : sourceNote,
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

  for (const { domain, seeds, author, sourceNote } of DOMAINS) {
    for (const seed of seeds) {
      const versionItem = buildVersionItem(domain, seed, now, author, sourceNote)
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
