import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { z } from 'zod'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  RoomCommandRequestSchema,
  type RoomCommandResponse,
  type RoomCommandAction,
  type FlowId,
  type SessionItem,
  type DecisionItem,
  type DecisionOptionItem,
  DECISION_ROOM_STEP_NUMBER,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, parseValue, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubEncryptField, stubDecryptField } from '../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../lib/prompt-registry'
import { callPromptModelStub } from '../lib/model-call-stub'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * POST /v1/rooms/decision — the "single flow-engine Lambda" (migration
 * plan §11, MVP_ARCHITECTURE.md §5.2): one command contract
 * (RoomCommandRequestSchema), a step map per `flowId`. Only `DECISION` is
 * registered so far; `MIRROR` gets its own step map once Slice 2 designs
 * its prompts/steps, reusing everything below (session bookkeeping,
 * optimistic concurrency, idempotency) unchanged — see FLOW_REGISTRY.
 *
 * Ownership is structural, same as the other handlers: `pk` is always
 * `userPk(requireUserId(event))`; `sessionId` is client-supplied but only
 * ever selects a sort key inside the caller's own partition.
 */

interface StepContext {
  pk: string
  sessionId: string
  action: RoomCommandAction
  input: Record<string, unknown>
}

interface StepResult {
  nextStepId: string | null // null = stay on this step (an AI-assist call, not a step transition)
  result: Record<string, unknown>
  promptRef?: string
}

interface StepDefinition {
  allowedActions: RoomCommandAction[]
  handle(ctx: StepContext): Promise<StepResult>
}

interface FlowDefinition {
  firstStepId: string
  steps: Record<string, StepDefinition>
}

function notImplementedStep(label: string): StepDefinition {
  return {
    allowedActions: ['SUBMIT_STEP', 'REFINE', 'SKIP', 'RESUME'],
    handle: async () => {
      throw new HttpError(501, 'step_not_implemented', `Step "${label}" isn't wired up yet — see docs/AGENT_LOG.md.`)
    },
  }
}

// ---- Decision Room step map ----
// Ported from apps/web/src/components/decision/Step01–07.tsx, mapped step
// by step this session (full breakdown + flagged ambiguities in the
// original UI — e.g. the `values_needs` lens silently collapsing into the
// `fears_desires` section in Step05, `refine_option` being dead code — are
// in docs/AGENT_LOG.md, not re-derived here). Only NAME_DECISION and
// MAP_OPTIONS are implemented; BODY_EMOTION through FUTURE_PROJECTION are
// registered (so the step-map mechanism and contract surface are real and
// visible) but return a clear 501 instead of silently missing.

type DecisionContent = { title: string; subtitle: string | null; narrative: string }

const NameDecisionSubmitInput = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
})
const NameDecisionRefineInput = z.object({
  title: z.string().min(1),
})

const nameDecisionStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      // Mirrors the original "Suggest a frame" button (Step01.tsx) — an
      // AI assist that does NOT advance the step.
      const { title } = parseValue(ctx.input, NameDecisionRefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'subtitle')
      const stub = await callPromptModelStub(version, { title })
      return {
        nextStepId: null,
        result: { subtitle: stub },
        promptRef: promptRef('decision_room', 'subtitle', version),
      }
    }

    const { title, subtitle } = parseValue(ctx.input, NameDecisionSubmitInput)
    const now = new Date().toISOString()
    const decision: DecisionItem = {
      pk: ctx.pk,
      sk: Sk.decisionRoom(ctx.sessionId),
      decisionId: ctx.sessionId,
      status: 'active',
      currentStep: DECISION_ROOM_STEP_NUMBER.MAP_OPTIONS, // matches original: completing step 1 sets current_step to 2
      lens: null,
      reviewDate: null,
      content: stubEncryptField<DecisionContent>({ title, subtitle: subtitle ?? null, narrative: '' }),
      createdAt: now,
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: decision }))
    return { nextStepId: 'MAP_OPTIONS', result: { title, subtitle: subtitle ?? null } }
  },
}

const MapOptionsRefineInput = z.object({ narrative: z.string().min(1) })
const MapOptionsOptionInput = z.object({ content: z.string().min(1), approved: z.boolean() })
const MapOptionsSubmitInput = z.object({
  narrative: z.string().min(1),
  optionA: MapOptionsOptionInput,
  optionB: MapOptionsOptionInput,
})

const mapOptionsStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP', 'REFINE'],
  handle: async (ctx) => {
    if (ctx.action === 'REFINE') {
      // Mirrors "Find My Options" (Step02.tsx) — suggests options, does not
      // advance; the user still approves/edits both before SUBMIT_STEP.
      const { narrative } = parseValue(ctx.input, MapOptionsRefineInput)
      const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'decision_room', 'parse_options')
      const stub = await callPromptModelStub(version, { narrative })
      return {
        nextStepId: null,
        result: typeof stub === 'string' ? { optionA: stub, optionB: stub } : stub,
        promptRef: promptRef('decision_room', 'parse_options', version),
      }
    }

    const { narrative, optionA, optionB } = parseValue(ctx.input, MapOptionsSubmitInput)
    if (!optionA.approved || !optionB.approved) {
      // Matches the original canContinue() gate — both options must be approved.
      throw new HttpError(400, 'options_not_approved', 'Both options must be approved before continuing.')
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: ctx.pk, sk: Sk.decisionRoom(ctx.sessionId) } })
    )
    const decisionItem = existing.Item as DecisionItem | undefined
    if (!decisionItem) {
      throw new HttpError(404, 'decision_not_found', 'No decision exists for this session — submit NAME_DECISION first.')
    }
    const existingContent = stubDecryptField<DecisionContent>(decisionItem.content)

    const now = new Date().toISOString()
    const updatedDecision: DecisionItem = {
      ...decisionItem,
      currentStep: DECISION_ROOM_STEP_NUMBER.BODY_EMOTION,
      content: stubEncryptField<DecisionContent>({ ...existingContent, narrative }),
      updatedAt: now,
    }
    const optionAItem: DecisionOptionItem = {
      pk: ctx.pk,
      sk: Sk.decisionOption(ctx.sessionId, 'A'),
      label: 'A',
      approved: true,
      content: stubEncryptField({ content: optionA.content }),
      createdAt: now,
    }
    const optionBItem: DecisionOptionItem = {
      pk: ctx.pk,
      sk: Sk.decisionOption(ctx.sessionId, 'B'),
      label: 'B',
      approved: true,
      content: stubEncryptField({ content: optionB.content }),
      createdAt: now,
    }

    await Promise.all([
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedDecision })),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: optionAItem })),
      ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: optionBItem })),
    ])

    return { nextStepId: 'BODY_EMOTION', result: { narrative, optionA: optionA.content, optionB: optionB.content } }
  },
}

const decisionFlow: FlowDefinition = {
  firstStepId: 'NAME_DECISION',
  steps: {
    NAME_DECISION: nameDecisionStep,
    MAP_OPTIONS: mapOptionsStep,
    BODY_EMOTION: notImplementedStep('BODY_EMOTION'),
    CHOOSE_LENS: notImplementedStep('CHOOSE_LENS'),
    DEEP_EXPLORATION: notImplementedStep('DEEP_EXPLORATION'),
    VALUES_NEEDS: notImplementedStep('VALUES_NEEDS'),
    FUTURE_PROJECTION: notImplementedStep('FUTURE_PROJECTION'),
  },
}

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
      status: 'active',
      currentStepId: nextCurrentStepId,
      sessionVersion: newSessionVersion,
      startedAt: existingSession?.startedAt ?? now,
      lastIdempotencyKey: body.idempotencyKey,
      lastResponse: response,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))

    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
