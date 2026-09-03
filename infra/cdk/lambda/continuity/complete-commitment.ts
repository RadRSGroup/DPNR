import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type CommitmentItem, type CompleteCommitmentResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { grantCredits, EARN_COMMITMENT_COMPLETED_CREDITS } from '../lib/credits'
import { ddb, TABLE_NAME } from './helpers'

/**
 * POST /v1/commitments/{commitmentId}/complete — the "Weekly Goal Achieved"
 * tile's real backing (My Wallet, Slice 6). No CommitmentItem had ever
 * transitioned away from `open` before this; a real "mark complete" action
 * genuinely didn't exist anywhere (checked before building this, same
 * discipline Slice 5's own doc comment used for its missing Edit/Delete UI).
 * A plain status flip on the caller's own already-stored data, same
 * no-consent-gate precedent as twin/confirm.ts.
 *
 * Idempotent: completing an already-`completed`/`dropped` commitment just
 * returns its current view rather than granting the reward again — the
 * only way to abuse this otherwise would be repeatedly completing the same
 * goal.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const crypto = await getSessionCrypto(userId)
    const commitmentId = event.pathParameters?.commitmentId
    if (!commitmentId) {
      throw new HttpError(400, 'missing_commitment_id', 'Path must include a commitment id.')
    }
    const sk = Sk.commitment(commitmentId)

    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }))
    const item = existing.Item as CommitmentItem | undefined
    if (!item) {
      throw new HttpError(404, 'commitment_not_found', `No commitment "${commitmentId}".`)
    }

    const description = (await crypto.decryptField<{ description: string }>(item.content)).description
    let status = item.status

    if (status === 'open') {
      const now = new Date().toISOString()
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk, sk },
          UpdateExpression: 'SET #status = :completed, updatedAt = :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':completed': 'completed', ':now': now },
        })
      )
      await grantCredits(ddb, TABLE_NAME, pk, EARN_COMMITMENT_COMPLETED_CREDITS, 'grant_earned', 'commitment_completed')
      status = 'completed'
    }

    const response: CompleteCommitmentResponse = {
      commitmentId: item.commitmentId,
      status,
      description,
      reviewDate: item.reviewDate,
      lifeDomain: item.lifeDomain,
      sourceRoomType: item.sourceRoomType,
      createdAt: item.createdAt,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
