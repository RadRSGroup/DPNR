import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  type SessionMessageItem,
  type CompanionActiveSessionPointerItem,
  type CompanionContextResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

// Full chat-resume view for the client — a different concern from
// message.ts's MODEL_CONTEXT_MESSAGES (which bounds the future model
// call's context budget), so intentionally not shared.
const CONTEXT_MESSAGE_LIMIT = 50

type MessageContent = { text: string }

/**
 * GET /v1/companion/context — recent turns for resuming a chat. Read-only
 * over the caller's own data; no consent gate, same reasoning as the
 * Dashboard handler (see lib/consent.ts's doc comment).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const pointerResult = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.companionActiveSession() } })
    )
    const pointer = pointerResult.Item as CompanionActiveSessionPointerItem | undefined
    if (!pointer) {
      const body: CompanionContextResponse = { sessionId: null, messages: [] }
      return jsonResponse(200, body)
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': Sk.sessionMessage(pointer.sessionId, '') },
        // Fetch the most recent CONTEXT_MESSAGE_LIMIT (not the oldest) — a
        // resume view needs the tail of a long session, not its start.
        ScanIndexForward: false,
        Limit: CONTEXT_MESSAGE_LIMIT,
      })
    )
    const items = ((result.Items ?? []) as SessionMessageItem[]).reverse() // back to chronological order

    const body: CompanionContextResponse = {
      sessionId: pointer.sessionId,
      messages: items.map((m) => ({
        role: m.role,
        text: stubDecryptField<MessageContent>(m.content).text,
        createdAt: m.createdAt,
      })),
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
