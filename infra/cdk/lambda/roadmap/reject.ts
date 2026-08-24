import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type RoadmapProposalRejectResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/roadmap/proposal/reject — discards the pending revision
 * (lib/roadmap-revision.ts); the live Roadmap is untouched. Idempotent by
 * design (DeleteCommand on a missing item is a no-op, not an error) — same
 * "correction is normal" tolerance Twin's own confirm/reject already has,
 * rather than 404ing on a proposal that's already gone.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmapProposal() } }))

    const response: RoadmapProposalRejectResponse = { ok: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
