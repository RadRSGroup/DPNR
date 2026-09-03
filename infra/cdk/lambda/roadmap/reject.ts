import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type RoadmapProposalRejectResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/roadmap/proposal/reject — discards the pending revision
 * (lib/roadmap-revision.ts); the live Roadmap's content is untouched.
 * Idempotent by design (DeleteCommand on a missing item is a no-op, not an
 * error) — same "correction is normal" tolerance Twin's own confirm/reject
 * already has, rather than 404ing on a proposal that's already gone.
 *
 * Intelligence Spec §17 — also resets the live RoadmapItem's lifecycleState
 * back to 'active' (roadmap-revision.ts flips it to 'evolving' when it
 * proposes a revision; rejecting means the roadmap stays exactly what it
 * was, so its state should too). A ConditionExpression guards against a
 * roadmap that somehow doesn't exist (shouldn't happen — a proposal can't
 * exist without one) rather than throwing on a missing item for a reject
 * action that must stay best-effort/idempotent.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    await Promise.all([
      ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmapProposal() } })),
      ddb
        .send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { pk, sk: Sk.roadmap() },
            UpdateExpression: 'SET lifecycleState = :active',
            ConditionExpression: 'attribute_exists(pk)',
            ExpressionAttributeValues: { ':active': 'active' },
          })
        )
        .catch(() => {
          // No live RoadmapItem to reset — nothing to do, same idempotent
          // tolerance the proposal delete above already has.
        }),
    ])

    const response: RoadmapProposalRejectResponse = { ok: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
