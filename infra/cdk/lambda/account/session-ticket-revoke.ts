import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, type RevokeSessionResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.SESSION_TICKETS_TABLE_NAME as string

/**
 * DELETE /v1/auth/sessions/{id} — revokes a session ticket early ("sign out
 * everywhere" / manual logout). Naturally idempotent — DynamoDB doesn't
 * error deleting an item that's already gone (expired via TTL, or already
 * revoked), so a retried/duplicate call is a clean 200, not an error.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const sessionId = event.pathParameters?.id
    if (!sessionId) {
      throw new HttpError(400, 'missing_session_id', 'Path must include a session id.')
    }

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk: GlobalKeys.sessionTicketPk(userId), sk: GlobalKeys.sessionTicketSk(sessionId) },
      })
    )

    const response: RevokeSessionResponse = { revoked: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
