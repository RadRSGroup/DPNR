import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { userPk, type CompanionCreateConversationResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { createConversation } from './session'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/companion/conversations — the explicit "New conversation"
 * action. No body, no crypto needed (the new session has no content yet).
 * Ownership is structural, same as every other handler here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const sessionId = await createConversation(ddb, TABLE_NAME, pk)

    const body: CompanionCreateConversationResponse = { sessionId }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
