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
import { requireConsent } from '../lib/consent'
import { consumeCredits, ROOM_REFINE_COST } from '../lib/credits'
import { toLanguageInstruction, type Locale } from '../lib/locale'
import { classifySafety, generateSafetyResponse, extractFreeTextForSafetyCheck } from '../lib/safety'
import { getSessionCrypto } from '../lib/session-crypto'
import { ddb, TABLE_NAME, PROMPT_REGISTRY_TABLE_NAME } from './db'
import { decisionFlow } from './decision-steps'
import { mirrorFlow } from './mirror-steps'
import type { FlowDefinition, StepResult } from './types'
import type { SessionCrypto } from '../lib/session-crypto'
import type { RoomCommandRequest } from '@dpnr/shared-types'

/**
 * The "single flow-engine Lambda" (migration plan §11, MVP_ARCHITECTURE.md
 * §5.2): one command contract (RoomCommandRequestSchema), a step map per
 * `flowId`. Bound to two API Gateway routes (`POST /v1/rooms/decision` and
 * `POST /v1/rooms/mirror`) — same Lambda function, same dispatcher, the
 * route only decides which `flowId` the client is expected to send.
 * `DECISION`'s full 14-step map lives in `./decision-steps`; `MIRROR`'s
 * first-pass 4-step map lives in `./mirror-steps` — see docs/AGENT_LOG.md
 * for the port notes on both (Decision Room's `values_needs` lens
 * decision; Mirror Room's step design, which is this session's own
 * reasonable first pass, not sourced from a spec doc — flagged there for
 * review, not a locked design).
 *
 * Ownership is structural, same as the other handlers: `pk` is always
 * `userPk(requireUserId(event))`; `sessionId` is client-supplied but only
 * ever selects a sort key inside the caller's own partition.
 *
 * Consent IS required here, same as Companion's message handler and for
 * the same reason (spec §8: "collecting consent before any
 * personal-content processing happens") — both Rooms capture exactly the
 * kind of personal content that rule targets, arguably more sensitive than
 * a Companion chat turn in Mirror Room's case. This was a real gap found
 * and closed by docs/PHASE_AUDIT.md §4.1 — this handler had no consent
 * check of any kind before that.
 */
const FLOW_REGISTRY: Partial<Record<FlowId, FlowDefinition>> = {
  DECISION: decisionFlow,
  MIRROR: mirrorFlow,
}

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, RoomCommandRequestSchema)
    const crypto = await getSessionCrypto(userId, 'active_session')

    // Hebrew Localization Slice E (docs/HEBREW_LOCALIZATION_PLAN.md §4.3):
    // requireConsent() already reads the full UserProfileItem — capture it
    // (previously discarded) rather than a second targeted read, same fix
    // Session 50 part 6 made for companion/message.ts.
    const profile = await requireConsent(ddb, TABLE_NAME, userId)
    const locale: Locale = profile.preferredLanguage
    const languageInstruction = toLanguageInstruction(locale, profile.genderIdentity)

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
    if (existingSession?.lastIdempotencyKey === body.idempotencyKey && existingSession.lastResponse) {
      const cachedResponse = await crypto.decryptField<RoomCommandResponse>(existingSession.lastResponse)
      return jsonResponse(200, cachedResponse)
    }

    if (body.action === 'REOPEN') {
      return jsonResponse(200, await reopenSession(flow, existingSession, body, pk, crypto))
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

    // Safety/crisis classification (spec §30, docs/SAFETY_SYSTEM_DESIGN.md
    // Stage 2, ADR 0012) — checked before any credit is consumed or the
    // step's own handler runs, since a safety_concern/immediate_danger
    // result must suspend the step's normal logic entirely ("do not
    // continue Mirror, Decision... until immediate safety is addressed"),
    // not just annotate its output. extractFreeTextForSafetyCheck() returns
    // null (no classification call at all) for commands with no real free
    // text — e.g. a REFINE that only carries an option-label selector.
    const freeText = extractFreeTextForSafetyCheck(body.input)
    let safetyIntervention: RoomCommandResponse['safetyIntervention'] = null
    if (freeText) {
      const sourceSurface = body.flowId === 'DECISION' ? 'decision_room' : 'mirror_room'
      const classification = await classifySafety(
        ddb,
        TABLE_NAME,
        PROMPT_REGISTRY_TABLE_NAME,
        pk,
        sourceSurface,
        body.sessionId,
        freeText,
        `Room: ${body.flowId}, Step: ${body.stepId}`
      )
      if (classification.safetyState === 'safety_concern' || classification.safetyState === 'immediate_danger') {
        const message = await generateSafetyResponse(ddb, PROMPT_REGISTRY_TABLE_NAME, classification, freeText, languageInstruction, locale)
        safetyIntervention = { safetyState: classification.safetyState, message }
      }
    }

    // REFINE calls the model (generates a fresh draft); SUBMIT_STEP/SKIP/RESUME
    // only persist what's already been refined — billable action is REFINE
    // alone (user's own confirmed decision, Session 18). One insertion point
    // covers every step's REFINE handler since they all dispatch through here.
    // A flagged safety intervention is never billed and never runs the
    // step's own handler — same "no reward/normal flow during a safety
    // flow" rule Companion's Stage 1 wiring already follows.
    let stepResult: StepResult
    if (safetyIntervention) {
      stepResult = { nextStepId: null, result: {} }
    } else {
      if (body.action === 'REFINE') {
        await consumeCredits(ddb, TABLE_NAME, pk, ROOM_REFINE_COST, 'room_refine')
      }
      stepResult = await step.handle({
        pk,
        sessionId: body.sessionId,
        action: body.action,
        input: body.input,
        crypto,
        languageInstruction,
      })
    }

    const newSessionVersion = (existingSession?.sessionVersion ?? 0) + 1
    const nextCurrentStepId = stepResult.nextStepId ?? existingSession?.currentStepId ?? body.stepId
    const now = new Date().toISOString()

    const response: RoomCommandResponse = {
      sessionId: body.sessionId,
      sessionVersion: newSessionVersion,
      nextStepId: stepResult.nextStepId,
      result: stepResult.result,
      promptRef: stepResult.promptRef,
      safetyIntervention,
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
      lastResponse: await crypto.encryptField<RoomCommandResponse>(response),
    }
    // Conditioned on the exact same version this handler read above
    // (security review 2026-09-14, DPNR-08): the check at lines 84-101 is
    // pure application-code comparison and protects nothing by itself —
    // two concurrent commands can both read the same sessionVersion, both
    // pass that check, both consume credits and run the step's model call,
    // then both reach this write and silently clobber one another,
    // dropping whichever transition wrote second. Re-asserting the
    // precondition atomically here means only one of two racing writes can
    // ever succeed; the loser gets a real 409 instead of a lost update.
    // For a brand-new session (no existingSession), the equivalent
    // precondition is "still doesn't exist" — attribute_not_exists(pk)
    // guards against two concurrent first-commands for the same sessionId.
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: updatedSession,
          ConditionExpression: existingSession ? 'sessionVersion = :expectedVersion' : 'attribute_not_exists(pk)',
          ...(existingSession
            ? { ExpressionAttributeValues: { ':expectedVersion': body.expectedSessionVersion } }
            : {}),
        })
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
        throw new HttpError(
          409,
          'session_version_conflict',
          'Another command for this session was written first — reload and retry with the current sessionVersion.'
        )
      }
      throw err
    }

    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * REOPEN (Session 67): puts a COMPLETED session back in progress at one of
 * its answer steps (`body.stepId`, from the flow's `reopenableSteps`), after
 * the flow's `onReopen` has undone what completing it produced (see
 * rooms/reopen.ts). Free — no model call, no credits; the person then moves
 * forward through the normal steps again, and finishing re-creates the
 * summary and Twin signals from their edited answers.
 *
 * Same guarantees as every other command: structural ownership (pk from the
 * JWT), optimistic concurrency (expectedSessionVersion, re-asserted by the
 * conditional write), idempotent replay via lastIdempotencyKey.
 */
async function reopenSession(
  flow: FlowDefinition,
  existingSession: SessionItem | undefined,
  body: RoomCommandRequest,
  pk: string,
  crypto: SessionCrypto
): Promise<RoomCommandResponse> {
  if (!existingSession) {
    throw new HttpError(404, 'session_not_found', 'No session exists for this id.')
  }
  if (existingSession.status !== 'completed') {
    throw new HttpError(409, 'session_not_completed', 'Only a finished session can be reopened — use Back instead.')
  }
  if (existingSession.sessionVersion !== body.expectedSessionVersion) {
    throw new HttpError(
      409,
      'session_version_conflict',
      `Expected session version ${existingSession.sessionVersion}, got ${body.expectedSessionVersion}.`
    )
  }
  if (!flow.reopenableSteps.includes(body.stepId)) {
    throw new HttpError(400, 'step_not_reopenable', `"${body.stepId}" can't be reopened.`)
  }

  await flow.onReopen({ pk, sessionId: body.sessionId })

  const newSessionVersion = existingSession.sessionVersion + 1
  const response: RoomCommandResponse = {
    sessionId: body.sessionId,
    sessionVersion: newSessionVersion,
    nextStepId: body.stepId,
    result: {},
    safetyIntervention: null,
  }
  const reopened: SessionItem = {
    pk,
    sk: Sk.session(body.sessionId),
    sessionId: body.sessionId,
    roomType: existingSession.roomType,
    status: 'active',
    currentStepId: body.stepId,
    sessionVersion: newSessionVersion,
    startedAt: existingSession.startedAt,
    lastIdempotencyKey: body.idempotencyKey,
    lastResponse: await crypto.encryptField<RoomCommandResponse>(response),
  }
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: reopened,
        ConditionExpression: 'sessionVersion = :expectedVersion',
        ExpressionAttributeValues: { ':expectedVersion': body.expectedSessionVersion },
      })
    )
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw new HttpError(409, 'session_version_conflict', 'Another command for this session was written first — reload and retry.')
    }
    throw err
  }
  return response
}
