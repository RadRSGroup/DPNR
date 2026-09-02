import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  SessionTicketRequestSchema,
  type SessionTicketItem,
  type SessionTicketResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.SESSION_TICKETS_TABLE_NAME as string

// First-draft durations, not yet a product decision — nothing renews a
// ticket today (no "touch"/sliding-refresh endpoint exists), so these are
// fixed windows from creation, not the migration plan's full 60min-sliding/
// 8h-hard-cap active_session behavior. Revisit once Stage 4 actually
// consumes a ticket for real decrypt calls.
const ACTIVE_SESSION_MINUTES = 60
const POST_SESSION_HOURS = 48

/**
 * POST /v1/session-ticket — establishes the bounded server-side decrypt
 * window (ADR 0013). `wrappedDek` arrives already RSA-OAEP-encrypted
 * client-side against the CMK's public key (GET /v1/session-ticket/public-key)
 * — this Lambda stores it verbatim as `kmsWrappedDek` and needs no KMS
 * permission at all; only Stage 4's `kms:Decrypt` calls ever unwrap it.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const body = parseBody(event, SessionTicketRequestSchema)

    const sessionId = randomUUID()
    const now = new Date()
    const durationMs =
      (body.purpose === 'active_session' ? ACTIVE_SESSION_MINUTES * 60 : POST_SESSION_HOURS * 3600) * 1000
    const expiresAt = new Date(now.getTime() + durationMs)

    const item: SessionTicketItem = {
      pk: GlobalKeys.sessionTicketPk(userId),
      sk: GlobalKeys.sessionTicketSk(sessionId),
      kmsWrappedDek: body.wrappedDek,
      purpose: body.purpose,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttl: Math.floor(expiresAt.getTime() / 1000),
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))

    const response: SessionTicketResponse = {
      sessionId,
      purpose: body.purpose,
      expiresAt: item.expiresAt,
    }
    return jsonResponse(201, response)
  } catch (err) {
    return errorResponse(err)
  }
}
