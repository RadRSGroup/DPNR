import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type MirrorRoomFullResponse, type SessionItem } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME } from './db'
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
    const crypto = await getSessionCrypto(userId)
    const mirrorId = event.pathParameters?.id
    if (!mirrorId) {
      throw new HttpError(400, 'missing_id', 'Path must include a mirror session id.')
    }

    const [session, sessionItemResult] = await Promise.all([
      getMirrorSession(pk, mirrorId),
      // mirrorId === sessionId for Mirror Room (situation.ts creates the
      // MirrorSessionItem with mirrorId: ctx.sessionId) — same key, no
      // extra lookup needed to find the associated SessionItem. Same
      // pattern as decision-full.ts's own sessionVersion lookup.
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.session(mirrorId) } })),
    ])
    const content = await crypto.decryptField<MirrorContent>(session.content)
    const sessionItem = sessionItemResult.Item as SessionItem | undefined

    const body: MirrorRoomFullResponse = {
      mirrorId: session.mirrorId,
      status: session.status,
      // Sourced from the generic SessionItem, NOT the MirrorSessionItem's
      // own currentStepId field — command.ts sets the former to
      // stepResult.nextStepId (the step to resume AT), while every
      // mirror-steps/*.ts handler sets the latter to itself (the step
      // just completed). Using session.currentStepId here was a real bug,
      // caught live: resuming mid-flow landed back on the just-finished
      // step instead of the next one. decision-full.ts already gets this
      // right by reading sessionItem?.currentStepId — same fix, applied
      // here.
      currentStepId: sessionItem?.currentStepId,
      sessionVersion: sessionItem?.sessionVersion,
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
