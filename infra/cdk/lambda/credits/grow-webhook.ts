import type { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { Sk, userPk, GrowWebhookPayloadSchema, type PendingPurchaseItem } from '@dpnr/shared-types'
import { parseValue, jsonResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const secretsManager = new SecretsManagerClient({})
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const GROW_CREDENTIALS_SECRET_ARN = process.env.GROW_CREDENTIALS_SECRET_ARN as string
const GROW_BASE_URL = process.env.GROW_BASE_URL as string

/**
 * UNCONFIRMED status value/code (ADR 0008 — no real sandbox transaction has
 * been seen). Grow's docs example showed the Hebrew string "שולם" ("paid")
 * for `data.status`; check both `status` and `statusCode` defensively since
 * which one is authoritative is also unconfirmed. Update this the moment a
 * real successful webhook is observed.
 */
function isSuccessStatus(status: string | undefined, statusCode: string | undefined): boolean {
  return status === 'שולם' || status?.toLowerCase() === 'paid' || statusCode === '1' || statusCode === '0'
}

/** JSON first (most likely for a modern API), form-encoded fallback — content-type is unconfirmed (ADR 0008). */
function parseWebhookBody(event: APIGatewayProxyEventV2): unknown {
  const text = event.body
    ? event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body
    : '{}'
  try {
    return JSON.parse(text)
  } catch {
    const params = new URLSearchParams(text)
    const flat: Record<string, unknown> = {}
    for (const [key, value] of params) flat[key] = value
    // Grow's form-encoded shape (if that's what this turns out to be) likely
    // flattens `data.transactionId` as `data[transactionId]` or similar —
    // this fallback is a best-effort guess, not a confirmed parser.
    return flat
  }
}

async function getGrowCredentials(): Promise<{ apiKey: string; userId: string; pageCode: string }> {
  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: GROW_CREDENTIALS_SECRET_ARN }))
  return JSON.parse(result.SecretString ?? '{}')
}

/** Best-effort acknowledgment — Grow's own docs say the transaction finalizes regardless of this call's outcome. */
async function acknowledgeTransaction(data: Record<string, string | undefined>): Promise<void> {
  try {
    const credentials = await getGrowCredentials()
    const form = new FormData()
    form.append('pageCode', credentials.pageCode)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) form.append(key, value)
    }
    await fetch(`${GROW_BASE_URL}/api/light/server/1.0/approveTransaction`, { method: 'POST', body: form })
  } catch (err) {
    console.error('Grow approveTransaction call failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}

/**
 * POST /v1/webhooks/payment — Grow's server-to-server callback, UNAUTHENTICATED
 * (Grow calls this directly, no Cognito JWT — see api-stack.ts, same
 * no-authorizer pattern as /v1/health).
 *
 * **This handler deliberately never grants credits itself** (safety valve,
 * see PendingPurchaseItemSchema's own doc comment and ADR 0008): Grow has no
 * signature scheme, and `cField1`/`cField2` correlation only proves the
 * webhook references a purchase this backend actually initiated — it does
 * NOT prove the payment happened, since a real user could forge this exact
 * callback for their own genuine pending purchase. A payload that passes
 * every check here only moves the item to `awaiting_review`, unverified;
 * `infra/cdk/scripts/approve-pending-purchase.ts` is the actual credit-grant
 * path, run manually after a human confirms the transaction against Grow's
 * own merchant dashboard.
 *
 * Always returns 200 for any recognized case (including "already
 * processed") so Grow doesn't retry-storm — only a genuinely
 * malformed/unparseable payload gets a non-200.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  let payload
  try {
    payload = parseValue(parseWebhookBody(event), GrowWebhookPayloadSchema)
  } catch (err) {
    console.error('Grow webhook payload did not match the expected shape:', err instanceof Error ? err.message : 'unknown')
    return jsonResponse(400, { error: { code: 'invalid_webhook_payload', message: 'Could not parse webhook body.' } })
  }

  const { data } = payload
  const purchaseId = data.cField1
  const userId = data.cField2
  if (!purchaseId || !userId) {
    console.error('Grow webhook missing cField1/cField2 correlation fields.')
    return jsonResponse(200, { received: true })
  }

  const pk = userPk(userId)
  const pendingResult = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.pendingPurchase(purchaseId) } })
  )
  const pending = pendingResult.Item as PendingPurchaseItem | undefined

  if (!pending || pending.status !== 'pending') {
    // Missing, already reviewed/completed/failed — idempotent no-op. Never
    // move an already-decided item back into review on a duplicate/retried
    // webhook delivery.
    return jsonResponse(200, { received: true })
  }

  const sumMatches = Number(data.sum) === pending.expectedPriceMinorUnits
  const succeeded = isSuccessStatus(data.status, data.statusCode)

  if (succeeded && sumMatches) {
    // Deliberately NOT a grantCredits() call here — see this file's own doc
    // comment and PendingPurchaseItemSchema's: this is an unverified claim
    // from a source with no signature, not proof of payment. A human must
    // confirm against Grow's own dashboard via approve-pending-purchase.ts.
    console.log(`Grow webhook claims purchase ${purchaseId} succeeded — awaiting manual review before any credits are granted.`)
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: Sk.pendingPurchase(purchaseId) },
        UpdateExpression: 'SET #status = :awaitingReview, claimedTransactionId = :txnId, claimedTransactionToken = :txnToken',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':awaitingReview': 'awaiting_review',
          ':txnId': data.transactionId,
          ':txnToken': data.transactionToken,
        },
      })
    )
  } else {
    console.error(
      `Grow webhook for purchase ${purchaseId} did not verify: succeeded=${succeeded} sumMatches=${sumMatches} (expected ${pending.expectedPriceMinorUnits}, got ${data.sum}).`
    )
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: Sk.pendingPurchase(purchaseId) },
        UpdateExpression: 'SET #status = :failed',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':failed': 'failed' },
      })
    )
  }

  await acknowledgeTransaction({
    transactionId: data.transactionId,
    transactionToken: data.transactionToken,
    sum: data.sum,
  })

  return jsonResponse(200, { received: true })
}
