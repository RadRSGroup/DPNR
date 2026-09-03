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

// Phase 6 Stage 4a (docs/AGENT_LOG.md Session 33, part 2): bumped from a
// first-draft 60 minutes to 8 hours — a deliberate, reversible stopgap. Nothing renews a
// ticket on activity (no "touch"/sliding-refresh endpoint exists, and won't
// until real usage data says a fixed window isn't enough); a tab left open
// longer than this needs a fresh sign-in. This is the first duration that
// actually matters — Stage 4 is what makes an expired ticket a real decrypt
// failure, not just a harmless unused row.
const ACTIVE_SESSION_MINUTES = 8 * 60
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
