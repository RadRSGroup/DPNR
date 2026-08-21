/**
 * Loads the Plans/Packages catalog seed data (plans.seed.ts) into the
 * deployed `dpnr-plans-catalog` DynamoDB table. Unlike Prompt
 * Registry/Library catalog, PlanItem has no version/alias split (§3.1's
 * schema: `PK: PLAN#<id>`, `SK: CONFIG`, no VERSION#/ALIAS# convention) —
 * simpler, one item per plan, since a plan swap is a product decision, not
 * something needing a canary rollout.
 *
 * Run manually after `cdk deploy Dpnr-Data` (or whenever plans.seed.ts
 * changes):
 *
 *   cd infra/cdk
 *   AWS_REGION=<region> npm run seed:plans-catalog
 *
 * Safe to re-run: each PutCommand overwrites the same pk/sk deterministically.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, PlanItemSchema, type PlanItem } from '@dpnr/shared-types'
import { PLAN_SEEDS } from './plans.seed'

const TABLE_NAME = process.env.PLANS_CATALOG_TABLE_NAME ?? 'dpnr-plans-catalog'

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  let count = 0

  for (const plan of PLAN_SEEDS) {
    const item: PlanItem = PlanItemSchema.parse({
      pk: GlobalKeys.planPk(plan.planId),
      sk: 'CONFIG',
      displayName: plan.displayName,
      kind: plan.kind,
      credits: plan.credits,
      priceMinorUnits: plan.priceMinorUnits,
      currency: plan.currency,
      ...('billingFrequency' in plan ? { billingFrequency: plan.billingFrequency } : {}),
      active: true,
    })

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
    count++
    console.log(`Seeded plan "${plan.planId}"`)
  }

  console.log(`Done: ${count} plans seeded into ${TABLE_NAME}.`)
}

main().catch((err) => {
  console.error('Plans catalog seed failed:', err)
  process.exit(1)
})
