import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { HttpError } from '../lib/http'
import { TwinRejectRequestSchema, type TwinSignalActionResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, parseBody } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME, findSignalById } from './helpers'

/**
 * POST /v1/twin/signals/{id}/reject — spec §5 Trust rules: "rejected
 * signals should not continue shaping personalization." Allowed from any
 * current status, same reasoning as confirm.ts.
 *
 * Optional body (2026-09-27, "Not quite" follow-up): `reason` (not_really /
 * partly / different) and `correction` (what feels more accurate, stored
 * encrypted). The UI rejects first, then may send the follow-up as a second
 * call for the same signal, which just updates it. Twin extraction reads
 * both back (lib/rejected-readings.ts) so the reading isn't proposed again.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const signalId = event.pathParameters?.id
    if (!signalId) {
      throw new HttpError(400, 'missing_signal_id', 'Path must include a signal id.')
    }
    const { reason, correction } = parseBody(event, TwinRejectRequestSchema)

    const signal = await findSignalById(userId, signalId)
    const now = new Date().toISOString()
    const set = ['#status = :status', 'updatedAt = :now']
    const values: Record<string, unknown> = { ':status': 'rejected', ':now': now }
    if (reason) {
      set.push('rejectReason = :reason')
      values[':reason'] = reason
    }
    if (correction) {
      // Only resolved when there's something to encrypt: a plain reject
      // needs no session ticket.
      const crypto = await getSessionCrypto(userId, 'active_session')
      set.push('feedback = :feedback')
      values[':feedback'] = await crypto.encryptField({ correction })
    }
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: signal.pk, sk: signal.sk },
        UpdateExpression: `SET ${set.join(', ')}`,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: values,
      })
    )

    const response: TwinSignalActionResponse = { signalId, status: 'rejected' }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
