import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { HttpError } from '../lib/http'
import type { TwinSignalActionResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { maybeProposeRoadmapRevision } from '../lib/roadmap-revision'
import { maybeClassifySignal } from '../lib/signal-classification'
import { ddb, TABLE_NAME, findSignalById } from './helpers'

const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * POST /v1/twin/signals/{id}/confirm — spec §5 Trust rules: a candidate
 * only becomes real personalization input once the user explicitly
 * confirms it. Allowed from any current status (not just `candidate`) —
 * the spec's own "Confirm · Not quite · Explore this" framing implies
 * back-and-forth, not a one-way ratchet, so re-confirming a rejected signal
 * is a legitimate correction, not an error.
 *
 * Also the trigger point for a possible Roadmap-revision proposal (Session
 * 16, the user's own direct choice — see lib/roadmap-revision.ts) and for
 * life-domain/archetype classification (Session 19, same direct choice of
 * trigger — see lib/signal-classification.ts) — both run inline,
 * synchronously, same "compute after the triggering action, no separate
 * event pipeline" choice Session 10 already made for Twin extraction
 * itself.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const crypto = await getSessionCrypto(userId)
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
        ExpressionAttributeValues: { ':status': 'confirmed', ':now': now },
      })
    )

    await maybeProposeRoadmapRevision(ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME, userId, crypto)
    await maybeClassifySignal(ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME, signal, crypto)

    const response: TwinSignalActionResponse = { signalId, status: 'confirmed' }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
