import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import {
  GlobalKeys,
  Sk,
  userPk,
  CreditsPurchaseRequestSchema,
  type PlanItem,
  type PendingPurchaseItem,
  type CreditsPurchaseResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const secretsManager = new SecretsManagerClient({})
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PLANS_CATALOG_TABLE_NAME = process.env.PLANS_CATALOG_TABLE_NAME as string
const GROW_CREDENTIALS_SECRET_ARN = process.env.GROW_CREDENTIALS_SECRET_ARN as string
const GROW_BASE_URL = process.env.GROW_BASE_URL as string
const API_BASE_URL = process.env.API_BASE_URL as string
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL as string

interface GrowCredentials {
  apiKey: string
  userId: string
  pageCode: string
}

let cachedCredentials: GrowCredentials | undefined

/** Fetched once per warm Lambda instance — this is config, not per-request data, no reason to re-fetch every invocation. */
async function getGrowCredentials(): Promise<GrowCredentials> {
  if (cachedCredentials) return cachedCredentials
  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: GROW_CREDENTIALS_SECRET_ARN }))
  if (!result.SecretString) {
    throw new HttpError(500, 'grow_credentials_missing', 'Grow credentials secret has no SecretString.')
  }
  cachedCredentials = JSON.parse(result.SecretString) as GrowCredentials
  return cachedCredentials
}

/**
 * POST /v1/credits/purchase — initiates a Grow hosted checkout page (ADR
 * 0008). Does NOT synchronously grant credits; the balance only changes once
 * `/v1/webhooks/payment` confirms real payment. No consent gate — same
 * profile as get-credits.ts/get-plans.ts, this is a billing action, not
 * personal-content processing.
 *
 * UNCONFIRMED against a real sandbox call (no Grow credentials existed this
 * session, see ADR 0008): the response field name for the checkout page URL
 * (guessed as `data.paymentPageLink` below — matching the "PaymentLinks"
 * naming Grow's docs use elsewhere), and whether `price` wants major or
 * minor currency units (passed through `priceMinorUnits` unconverted below
 * — VERIFY before this handles real money, a wrong assumption here either
 * over- or under-charges by 100x).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, CreditsPurchaseRequestSchema)

    const planResult = await ddb.send(
      new GetCommand({
        TableName: PLANS_CATALOG_TABLE_NAME,
        Key: { pk: GlobalKeys.planPk(body.planId), sk: 'CONFIG' },
      })
    )
    const plan = planResult.Item as PlanItem | undefined
    if (!plan || !plan.active) {
      throw new HttpError(404, 'plan_not_found', `No active plan "${body.planId}".`)
    }
    if (plan.kind !== 'credit_pack') {
      throw new HttpError(400, 'plan_not_purchasable', `Plan "${body.planId}" is a "${plan.kind}", not a credit_pack.`)
    }

    const purchaseId = randomUUID()
    const now = new Date().toISOString()
    const pendingPurchase: PendingPurchaseItem = {
      pk,
      sk: Sk.pendingPurchase(purchaseId),
      purchaseId,
      planId: body.planId,
      status: 'pending',
      expectedCredits: plan.credits,
      expectedPriceMinorUnits: plan.priceMinorUnits,
      createdAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: pendingPurchase }))

    const credentials = await getGrowCredentials()
    const form = new FormData()
    form.append('userId', credentials.userId)
    form.append('pageCode', credentials.pageCode)
    form.append('paymentLinkType', '2') // closed / one-time link
    form.append('isActive', '1')
    form.append('title', plan.displayName)
    form.append('paymentTypes[0][type]', 'payments')
    form.append('paymentTypes[0][payments][paymentsPaymentNum]', '1')
    form.append('products[data][0][name]', plan.displayName)
    // UNCONFIRMED: priceMinorUnits passed through as-is — verify Grow expects
    // agorot (minor units) here, not whole ILS, before any real charge.
    form.append('products[data][0][price]', String(plan.priceMinorUnits))
    form.append('products[data][0][vatType]', '1') // regular VAT
    form.append('notifyUrl', `${API_BASE_URL}/v1/webhooks/payment`)
    form.append('successUrl', `${FRONTEND_BASE_URL}/account?purchase=pending`)
    form.append('cField1', purchaseId)
    form.append('cField2', userId)

    const growResponse = await fetch(`${GROW_BASE_URL}/api/light/server/1.0/CreatePaymentLink`, {
      method: 'POST',
      headers: { 'x-api-key': credentials.apiKey },
      body: form,
    })
    if (!growResponse.ok) {
      throw new HttpError(502, 'grow_request_failed', `Grow CreatePaymentLink returned HTTP ${growResponse.status}.`)
    }
    const growBody = (await growResponse.json()) as Record<string, unknown>
    const data = growBody.data as Record<string, unknown> | undefined
    const paymentPageUrl = data?.paymentPageLink ?? data?.paymentPageUrl ?? data?.url
    if (typeof paymentPageUrl !== 'string') {
      throw new HttpError(
        502,
        'grow_response_unrecognized',
        'Grow CreatePaymentLink response did not contain a recognized payment-page-URL field — the real field name is unconfirmed (see ADR 0008), update this handler once a real sandbox response is seen.'
      )
    }

    const response: CreditsPurchaseResponse = { paymentPageUrl, purchaseId }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
