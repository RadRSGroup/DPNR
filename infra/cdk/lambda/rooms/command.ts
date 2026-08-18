import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  RoomCommandRequestSchema,
  type RoomCommandResponse,
  type FlowId,
  type SessionItem,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { ddb, TABLE_NAME } from './decision-steps/db'
import { decisionFlow } from './decision-steps'
import type { FlowDefinition } from './decision-steps/types'

/**
 * POST /v1/rooms/decision — the "single flow-engine Lambda" (migration
 * plan §11, MVP_ARCHITECTURE.md §5.2): one command contract
 * (RoomCommandRequestSchema), a step map per `flowId`. Only `DECISION` is
 * registered so far (its full 7-step map lives in ./decision-steps —
 * see docs/AGENT_LOG.md for the step-by-step port notes and the
 * `values_needs` lens decision). `MIRROR` gets its own step map once
 * Slice 2 designs its prompts/steps, reusing everything below (session
 * bookkeeping, optimistic concurrency, idempotency) unchanged.
 *
 * Ownership is structural, same as the other handlers: `pk` is always
 * `userPk(requireUserId(event))`; `sessionId` is client-supplied but only
 * ever selects a sort key inside the caller's own partition.
 */
const FLOW_REGISTRY: Partial<Record<FlowId, FlowDefinition>> = {
  DECISION: decisionFlow,
  // MIRROR: not yet implemented — see MVP_ARCHITECTURE.md §5.2.
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, RoomCommandRequestSchema)

    const flow = FLOW_REGISTRY[body.flowId]
    if (!flow) {
      throw new HttpError(501, 'flow_not_implemented', `flowId "${body.flowId}" has no registered flow definition yet.`)
    }

    const sessionKey = { pk, sk: Sk.session(body.sessionId) }
    const sessionResult = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: sessionKey }))
    const existingSession = sessionResult.Item as SessionItem | undefined

    // Idempotent replay short-circuits BEFORE the version check below — a
    // retried request naturally carries an expectedSessionVersion that's
    // now stale after the first, successful attempt already advanced it.
    if (existingSession?.lastIdempotencyKey === body.idempotencyKey) {
      return jsonResponse(200, existingSession.lastResponse as RoomCommandResponse)
    }

    if (existingSession) {
      if (existingSession.status === 'completed') {
        throw new HttpError(409, 'session_completed', 'This session has already finished — no further commands are accepted.')
      }
      if (existingSession.sessionVersion !== body.expectedSessionVersion) {
        throw new HttpError(
          409,
          'session_version_conflict',
          `Expected session version ${existingSession.sessionVersion}, got ${body.expectedSessionVersion}.`
        )
      }
    } else if (body.expectedSessionVersion !== 0) {
      throw new HttpError(
        404,
        'session_not_found',
        'No session exists yet for this id — the first command for a new session must use expectedSessionVersion: 0.'
      )
    }

    const step = flow.steps[body.stepId]
    if (!step) {
      throw new HttpError(400, 'unknown_step', `"${body.stepId}" isn't a recognized step for flowId "${body.flowId}".`)
    }
    if (!step.allowedActions.includes(body.action)) {
      throw new HttpError(400, 'action_not_allowed', `Action "${body.action}" isn't valid for step "${body.stepId}".`)
    }

    const stepResult = await step.handle({
      pk,
      sessionId: body.sessionId,
      action: body.action,
      input: body.input,
    })

    const newSessionVersion = (existingSession?.sessionVersion ?? 0) + 1
    const nextCurrentStepId = stepResult.nextStepId ?? existingSession?.currentStepId ?? body.stepId
    const now = new Date().toISOString()

    const response: RoomCommandResponse = {
      sessionId: body.sessionId,
      sessionVersion: newSessionVersion,
      nextStepId: stepResult.nextStepId,
      result: stepResult.result,
      promptRef: stepResult.promptRef,
    }

    const updatedSession: SessionItem = {
      pk,
      sk: Sk.session(body.sessionId),
      sessionId: body.sessionId,
      roomType: body.flowId === 'DECISION' ? 'decision' : 'mirror',
      status: stepResult.sessionComplete ? 'completed' : 'active',
      currentStepId: nextCurrentStepId,
      sessionVersion: newSessionVersion,
      startedAt: existingSession?.startedAt ?? now,
      ...(stepResult.sessionComplete ? { endedAt: now } : {}),
      lastIdempotencyKey: body.idempotencyKey,
      lastResponse: response,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))

    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
