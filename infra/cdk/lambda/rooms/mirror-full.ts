import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { userPk, type MirrorRoomFullResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { getMirrorSession, type MirrorContent } from './mirror-steps/helpers'

const orUndefined = (s: string): string | undefined => (s ? s : undefined)

/**
 * GET /v1/rooms/mirror/{id}/full. Ownership is structural, same as
 * decision-full.ts — `id` is client-supplied but only ever selects a sort
 * key inside the caller's own partition.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const mirrorId = event.pathParameters?.id
    if (!mirrorId) {
      throw new HttpError(400, 'missing_id', 'Path must include a mirror session id.')
    }

    const session = await getMirrorSession(pk, mirrorId)
    const content = stubDecryptField<MirrorContent>(session.content)

    const body: MirrorRoomFullResponse = {
      mirrorId: session.mirrorId,
      status: session.status,
      currentStepId: session.currentStepId,
      situation: orUndefined(content.situation),
      trigger: orUndefined(content.trigger),
      thought: orUndefined(content.thought),
      emotion: orUndefined(content.emotion),
      bodyResponse: orUndefined(content.bodyResponse),
      automaticReaction: orUndefined(content.automaticReaction),
      copingResponse: orUndefined(content.copingResponse),
      recurringPattern: orUndefined(content.recurringPattern),
      energyMoodEffect: orUndefined(content.energyMoodEffect),
      lifeDomain: orUndefined(content.lifeDomain),
      commitment: orUndefined(content.commitment),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
