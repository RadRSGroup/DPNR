import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type OpenThreadActionResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/open-threads/{id}/pause — "still part of the map, but not a
 * current priority" (Intelligence Spec §17's own Roadmap-Paused framing,
 * applied here). Unlike `close`, a paused thread is reversible — nothing in
 * this pass adds a resume endpoint since there's no product need for it yet
 * (a paused thread still shows in GET /v1/open-threads, just excluded from
 * Companion's own context-injection set), but the state itself isn't
 * terminal.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const threadId = event.pathParameters?.id
    if (!threadId) {
      throw new HttpError(400, 'missing_thread_id', 'Path must include a thread id.')
    }

    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: userPk(userId), sk: Sk.openThread(threadId) },
          UpdateExpression: 'SET #status = :status, lastTouchedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': 'paused', ':now': new Date().toISOString() },
          ConditionExpression: 'attribute_exists(pk)',
        })
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
        throw new HttpError(404, 'thread_not_found', `No Open Thread exists with id "${threadId}".`)
      }
      throw err
    }

    const response: OpenThreadActionResponse = { threadId, status: 'paused' }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
