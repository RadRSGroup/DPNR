import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { HttpError } from '../lib/http'
import type { TwinSignalActionResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { ddb, TABLE_NAME, findSignalById } from './helpers'

/**
 * POST /v1/twin/signals/{id}/reject — spec §5 Trust rules: "rejected
 * signals should not continue shaping personalization." Allowed from any
 * current status, same reasoning as confirm.ts.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const signalId = event.pathParameters?.id
    if (!signalId) {
      throw new HttpError(400, 'missing_signal_id', 'Path must include a signal id.')
    }

    const signal = await findSignalById(userId, signalId)
    const now = new Date().toISOString()
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: signal.pk, sk: signal.sk },
        UpdateExpression: 'SET #status = :status, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'rejected', ':now': now },
      })
    )

    const response: TwinSignalActionResponse = { signalId, status: 'rejected' }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
