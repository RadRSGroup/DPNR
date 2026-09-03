import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  CreateCommitmentRequestSchema,
  type CommitmentItem,
  type CreateCommitmentResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse } from '../lib/http'
import { requireConsent } from '../lib/consent'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './helpers'

/**
 * POST /v1/commitments (MVP_ARCHITECTURE.md §5.7). Consent IS required —
 * same rule as Rooms/Companion (lib/consent.ts): this captures freshly-typed
 * personal content (the commitment description), not a read of existing
 * data. Does NOT set up any reminder — reviewDate is stored as-is; whether/
 * how it ever fires a notification is still an open product decision (see
 * docs/AGENT_LOG.md "Prompt for next agent" item 3), deliberately out of
 * scope for this plain synchronous write.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, CreateCommitmentRequestSchema)
    const crypto = await getSessionCrypto(userId)

    await requireConsent(ddb, TABLE_NAME, userId)

    const commitmentId = randomUUID()
    const now = new Date().toISOString()

    const item: CommitmentItem = {
      pk,
      sk: Sk.commitment(commitmentId),
      commitmentId,
      status: 'open',
      reviewDate: body.reviewDate,
      ...(body.lifeDomain ? { lifeDomain: body.lifeDomain } : {}),
      ...(body.sourceRoomType ? { sourceRoomType: body.sourceRoomType } : {}),
      ...(body.sourceSessionId ? { sourceSessionId: body.sourceSessionId } : {}),
      content: await crypto.encryptField<{ description: string }>({ description: body.description }),
      createdAt: now,
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))

    const response: CreateCommitmentResponse = {
      commitmentId,
      status: 'open',
      description: body.description,
      reviewDate: body.reviewDate,
      lifeDomain: body.lifeDomain,
      sourceRoomType: body.sourceRoomType,
      createdAt: now,
    }
    return jsonResponse(201, response)
  } catch (err) {
    return errorResponse(err)
  }
}
