import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { type PlanItem, type PlansResponse } from '@dpnr/shared-types'
import { jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.PLANS_CATALOG_TABLE_NAME as string

/**
 * GET /v1/plans — public catalog read, same profile as
 * library/topics.ts's Scan-based approach: config-like table (authored by
 * the DPNR team, low write volume), no per-user ownership, so no
 * `requireUserId` call despite sitting behind the Cognito authorizer at
 * the route level. Only `active` plans are ever returned; `active` itself
 * isn't part of the client-facing PlanSummary shape.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async () => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'active = :true',
        ExpressionAttributeValues: { ':true': true },
      })
    )

    const plans = ((result.Items ?? []) as PlanItem[]).map((p) => ({
      planId: p.pk.replace('PLAN#', ''),
      displayName: p.displayName,
      kind: p.kind,
      credits: p.credits,
      priceMinorUnits: p.priceMinorUnits,
      currency: p.currency,
      billingFrequency: p.billingFrequency,
    }))

    const body: PlansResponse = { plans }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
