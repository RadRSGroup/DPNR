/**
 * Manual safety valve for Grow purchases (ADR 0008, Session 18) — the only
 * path that actually grants credits for a Grow purchase. `credits/grow-webhook.ts`
 * deliberately never calls grantCredits itself: Grow's real API has no
 * signature, so a webhook claiming "payment succeeded" is not proof of
 * payment on its own (see PendingPurchaseItemSchema's own doc comment for
 * the full reasoning). Run this only after you've independently confirmed
 * the transaction in Grow's own merchant dashboard — this script trusts
 * your confirmation, not the webhook's claim.
 *
 * Usage:
 *   cd infra/cdk
 *   npx ts-node --prefer-ts-exts scripts/approve-pending-purchase.ts --userId <cognito-sub> --purchaseId <uuid> --confirm
 *
 * Without --confirm, prints what it would do and exits without writing
 * anything — use this first to review the claimed transaction details
 * against Grow's dashboard before re-running with --confirm.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type PendingPurchaseItem } from '@dpnr/shared-types'
import { grantCredits } from '../lambda/lib/credits'

const TABLE_NAME = process.env.APPLICATION_TABLE_NAME ?? 'dpnr-application'

function readArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx !== -1 ? process.argv[idx + 1] : undefined
}

async function main() {
  const userId = readArg('userId')
  const purchaseId = readArg('purchaseId')
  const confirm = process.argv.includes('--confirm')

  if (!userId || !purchaseId) {
    console.error('Usage: --userId <cognito-sub> --purchaseId <uuid> [--confirm]')
    process.exit(1)
  }

  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
  const pk = userPk(userId)
  const sk = Sk.pendingPurchase(purchaseId)

  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }))
  const item = result.Item as PendingPurchaseItem | undefined

  if (!item) {
    console.error(`No PendingPurchaseItem found for ${pk} / ${sk}.`)
    process.exit(1)
  }
  if (item.status !== 'awaiting_review') {
    console.error(`Status is "${item.status}", not "awaiting_review" — nothing to approve (already decided, or webhook hasn't fired yet).`)
    process.exit(1)
  }

  console.log('Pending purchase found:')
  console.log(`  planId: ${item.planId}`)
  console.log(`  expectedCredits: ${item.expectedCredits}`)
  console.log(`  expectedPriceMinorUnits: ${item.expectedPriceMinorUnits}`)
  console.log(`  claimedTransactionId: ${item.claimedTransactionId ?? '(none)'}`)
  console.log(`  claimedTransactionToken: ${item.claimedTransactionToken ?? '(none)'}`)
  console.log(`  createdAt: ${item.createdAt}`)

  if (!confirm) {
    console.log('\nDRY RUN — no credits granted. Re-run with --confirm after verifying this transaction in Grow\'s own merchant dashboard.')
    return
  }

  await grantCredits(ddb, TABLE_NAME, pk, item.expectedCredits, 'grant_purchase', 'grow_purchase', item.planId)
  const now = new Date().toISOString()
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
      UpdateExpression: 'SET #status = :completed, reviewedAt = :now, completedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':completed': 'completed', ':now': now },
    })
  )
  console.log(`\nApproved: granted ${item.expectedCredits} credits to ${pk}.`)
}

main().catch((err) => {
  console.error('approve-pending-purchase failed:', err)
  process.exit(1)
})
