import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  RoadmapLifecycleActionRequestSchema,
  type RoadmapItem,
  type RoadmapLifecycleState,
  type RoadmapLifecycleActionResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * Intelligence Spec §17 — the one genuinely new piece of Roadmap Lifecycle
 * functionality (every other state transition just labels something that
 * already happens elsewhere — see roadmap-revision.ts/accept.ts/reject.ts).
 * One endpoint, one small validated-transition table, rather than three
 * separate pause/resume/archive Lambdas — the action is the only variable
 * part, and the guard logic is identical regardless of which one is called.
 */
const ALLOWED_TRANSITIONS: Record<'pause' | 'resume' | 'archive', RoadmapLifecycleState[]> = {
  pause: ['active', 'evolving'],
  resume: ['paused', 'archived'],
  archive: ['active', 'paused', 'evolving'],
}

const TARGET_STATE: Record<'pause' | 'resume' | 'archive', RoadmapLifecycleState> = {
  pause: 'paused',
  resume: 'active',
  archive: 'archived',
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, RoadmapLifecycleActionRequestSchema)

    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmap() } }))
    const roadmapItem = result.Item as RoadmapItem | undefined
    if (!roadmapItem) {
      throw new HttpError(404, 'no_roadmap', 'No Roadmap exists yet for this account.')
    }

    if (!ALLOWED_TRANSITIONS[body.action].includes(roadmapItem.lifecycleState)) {
      throw new HttpError(
        409,
        'invalid_lifecycle_transition',
        `Cannot ${body.action} a Roadmap currently in state "${roadmapItem.lifecycleState}".`
      )
    }

    const newState = TARGET_STATE[body.action]
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: Sk.roadmap() },
        UpdateExpression: 'SET lifecycleState = :state, updatedAt = :now',
        ExpressionAttributeValues: { ':state': newState, ':now': new Date().toISOString() },
      })
    )

    const response: RoadmapLifecycleActionResponse = { lifecycleState: newState }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
