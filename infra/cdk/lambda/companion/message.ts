import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  CompanionMessageRequestSchema,
  CompanionDirectiveSchema,
  type CompanionDirective,
  type CompanionMessageResponse,
  type SessionMessageItem,
  type RoadmapItem,
  type TwinSignalItem,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { requireConsent } from '../lib/consent'
import { stubEncryptField, stubDecryptField } from '../lib/crypto-stub'
import { resolvePromptVersion } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { listActiveTopics } from '../lib/library-catalog'
import { gatherContinuityContext } from '../continuity/gather-context'
import { roadmapExists } from '../lib/roadmap'
import { getOrCreateActiveCompanionSession } from './session'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string
const LIBRARY_CATALOG_TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string

type CompanionTurn = { role: 'user' | 'assistant'; text: string }

// Two different tunables, deliberately not shared: this bounds how much
// history the model call gets as context. CONTEXT_MESSAGE_LIMIT in
// context.ts bounds a client's full chat-resume view — a different concern
// with a different right answer.
const MODEL_CONTEXT_MESSAGES = 20

// Idempotency: only guards an immediate client retry (e.g. a timed-out
// request the client resubmits with the same clientMessageId) — checks
// only the last few messages pulled for model context, not the whole
// session's history. A retry sent long after that window would create a
// duplicate turn. Acceptable here because Companion chat is not a
// financial or destructive action — unlike the credits/webhook idempotency
// this contract shape is modeled on, a duplicated chat turn is a UX nit,
// not a correctness incident.
const IDEMPOTENCY_LOOKBACK = 5

// Session 15 (workstream D): a safety valve, not a target — spec says "ask
// only what is needed," not a fixed count. If the model still hasn't set
// readyForRoadmap after this many of the person's own turns, the next call
// is forced to conclude with its best-effort inference rather than asking
// forever. An unconfirmed placeholder, same status as CONTINUATION_GAP_HOURS.
const MAX_ONBOARDING_USER_TURNS = 8

type MessageContent = { text: string }
type RoadmapContent = { currentFocus: string; theme: string; direction: string; suggestedSpaces: string[] }

/**
 * POST /v1/companion/message. Ownership is structural (see dashboard
 * handler's comment) — every key is built from the caller's own `sub`.
 * Consent IS required here (unlike the read endpoints) because this
 * handler sends freshly-typed personal content to a model — see
 * lib/consent.ts.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, CompanionMessageRequestSchema)

    await requireConsent(ddb, TABLE_NAME, userId)

    const sessionId = await getOrCreateActiveCompanionSession(ddb, TABLE_NAME, pk)
    const recentMessages = await queryRecentMessages(pk, sessionId, MODEL_CONTEXT_MESSAGES)

    const duplicate = recentMessages
      .slice(-IDEMPOTENCY_LOOKBACK)
      .find((m) => m.clientMessageId === body.clientMessageId)
    if (duplicate) {
      const reply = recentMessages.find(
        (m) => m.role === 'assistant' && m.createdAt > duplicate.createdAt
      )
      const response: CompanionMessageResponse = {
        sessionId,
        reply: reply ? stubDecryptField<MessageContent>(reply.content).text : '',
        directive: null,
      }
      return jsonResponse(200, response)
    }

    const now = new Date().toISOString()
    const userMessage: SessionMessageItem = {
      pk,
      sk: Sk.sessionMessage(sessionId, now),
      role: 'user',
      content: stubEncryptField<MessageContent>({ text: body.text }),
      createdAt: now,
      clientMessageId: body.clientMessageId,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: userMessage }))

    const history: CompanionTurn[] = recentMessages.map((m) => ({
      role: m.role,
      text: stubDecryptField<MessageContent>(m.content).text,
    }))

    const hasRoadmap = await roadmapExists(ddb, TABLE_NAME, pk)
    const { reply, directive } = hasRoadmap
      ? await callCompanionModel(userId, history, body.text)
      : await runOnboardingTurn(pk, sessionId, history, body.text)

    const replyAt = new Date().toISOString()
    const assistantMessage: SessionMessageItem = {
      pk,
      sk: Sk.sessionMessage(sessionId, replyAt),
      role: 'assistant',
      content: stubEncryptField<MessageContent>({ text: reply }),
      createdAt: replyAt,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: assistantMessage }))

    const response: CompanionMessageResponse = { sessionId, reply, directive }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}

/** Most recent `limit` messages for this session, in chronological order. */
async function queryRecentMessages(
  pk: string,
  sessionId: string,
  limit: number
): Promise<SessionMessageItem[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': Sk.sessionMessage(sessionId, '') },
      ScanIndexForward: false, // most recent first
      Limit: limit,
    })
  )
  const items = (result.Items ?? []) as SessionMessageItem[]
  return items.reverse() // chronological order for conversation history
}

/**
 * Real Bedrock call via the `companion/respond` Prompt Registry domain
 * (infra/cdk/scripts/companion-prompts.seed.ts) — replaces the former
 * `callCompanionModel` stub (companion/model-stub.ts, deleted this
 * session). `history` excludes the just-submitted turn (queried before it's
 * written, see the handler above); `userText` is that turn.
 *
 * Session 14 (workstream C, part 2): also pulls the caller's confirmed
 * Digital Twin signals into the prompt via `gatherContinuityContext` — the
 * same shared read the Continuity composers and this handler's own
 * `context.ts` continuation synthesis use — so every reply is informed by
 * what's already known, not just the raw chat history. Only `confirmedSignals`
 * is used here; `sessionSummaries` (the other half of that read) isn't —
 * `respond` is a per-turn reactive reply, not a cross-session synthesis, so
 * pulling in session summaries here would duplicate what `continuation`
 * already does at open-time for no stated benefit.
 */
async function callCompanionModel(
  userId: string,
  history: CompanionTurn[],
  userText: string
): Promise<{ reply: string; directive: CompanionDirective | null }> {
  const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'companion', 'respond')
  const topics = await listActiveTopics(ddb, LIBRARY_CATALOG_TABLE_NAME)
  const { confirmedSignals } = await gatherContinuityContext(userId)

  const conversationHistory =
    history.length > 0
      ? history.map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.text}`).join('\n')
      : '(no prior messages — this is the start of the conversation)'
  const libraryTopics =
    topics.length > 0 ? topics.map((t) => `- ${t.slug}: ${t.title}`).join('\n') : '(none available)'
  const confirmedSignalsText =
    confirmedSignals.length > 0
      ? confirmedSignals
          .slice(0, 5)
          .map((s) => `- (${s.domain}) ${s.description}`)
          .join('\n')
      : '(nothing confirmed yet)'

  const result = await callPromptModel(version, {
    conversationHistory,
    confirmedSignals: confirmedSignalsText,
    libraryTopics,
    currentMessage: userText,
  })
  if (typeof result === 'string') {
    throw new HttpError(502, 'model_call_failed', 'Companion prompt did not return forced tool-use output.')
  }

  const reply = typeof result.reply === 'string' ? result.reply : ''
  return { reply, directive: buildDirective(result, topics.map((t) => t.slug)) }
}

/**
 * Turns the model's flat `directiveKind` + optional fields into a real
 * `CompanionDirective`, or `null` if the model's output doesn't actually
 * form a valid one (missing `roomType` for `open_room`, a `topicSlug` that
 * isn't in the live catalog, etc.) — a bad routing suggestion degrades to
 * "just reply", never a thrown error, same tolerance principle
 * twin-signals.ts and the continuity composers use for their own model
 * output. `promptRef` isn't stored anywhere yet — Companion has no
 * per-message content item to attach it to the way Rooms/Library do.
 */
function buildDirective(result: Record<string, unknown>, validTopicSlugs: string[]): CompanionDirective | null {
  const candidate =
    result.directiveKind === 'open_room'
      ? { kind: 'open_room', roomType: result.roomType }
      : result.directiveKind === 'open_dashboard'
        ? { kind: 'open_dashboard' }
        : result.directiveKind === 'open_library_topic' && validTopicSlugs.includes(result.topicSlug as string)
          ? { kind: 'open_library_topic', topicSlug: result.topicSlug }
          : null
  if (!candidate) return null

  const parsed = CompanionDirectiveSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

/**
 * Session 15 (workstream D): runs one turn of the `companion/onboard`
 * prompt instead of `respond`, for every user without a Roadmap yet — the
 * spec's Golden Path A steps 5–8 ("Companion-led conversational onboarding"
 * through "Generate initial Roadmap"). Never carries a directive — routing
 * into a Room/Dashboard/Library is step 10, which only happens once a
 * Roadmap exists and the *next* message goes through the normal `respond`
 * path instead; `onboard` itself stays focused on one thing.
 *
 * When the model sets `readyForRoadmap`, this writes the real `RoadmapItem`
 * plus two Twin signals (`current_focus`, `direction`) in the same call —
 * both **written as already `confirmed`**, not `candidate` like every other
 * signal source. Deliberate, user-confirmed exception (not the general
 * trust-rule default): the person is directly stating their own focus in
 * conversation, not being inferred about from indirect behavior — the
 * spec's own trust rule distinguishes "facts explicitly stated by the user"
 * from AI inferences, and there is no Twin confirm/reject frontend at all
 * yet for a `candidate` signal to ever be acted on. Revisit this choice
 * once a real Twin UI exists.
 */
async function runOnboardingTurn(
  pk: string,
  sessionId: string,
  history: CompanionTurn[],
  userText: string
): Promise<{ reply: string; directive: CompanionDirective | null }> {
  const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'companion', 'onboard')

  const conversationHistory =
    history.length > 0
      ? history.map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.text}`).join('\n')
      : '(no prior messages — this is the start of the conversation)'
  const userTurnCount = history.filter((m) => m.role === 'user').length + 1 // +1 for the turn being answered now
  const conclusionInstruction =
    userTurnCount >= MAX_ONBOARDING_USER_TURNS
      ? 'You must set readyForRoadmap to true now and give your honest best-effort currentFocus/theme/direction from everything shared so far, even if it feels incomplete — do not ask another question.'
      : ''

  const result = await callPromptModel(version, {
    conversationHistory,
    currentMessage: userText,
    conclusionInstruction,
  })
  if (typeof result === 'string') {
    throw new HttpError(502, 'model_call_failed', 'Onboarding prompt did not return forced tool-use output.')
  }

  const reply = typeof result.reply === 'string' ? result.reply : ''
  if (result.readyForRoadmap === true) {
    await persistInitialRoadmap(pk, sessionId, result)
  }
  return { reply, directive: null }
}

async function persistInitialRoadmap(pk: string, sessionId: string, result: Record<string, unknown>): Promise<void> {
  const currentFocus = typeof result.currentFocus === 'string' ? result.currentFocus : ''
  const theme = typeof result.theme === 'string' ? result.theme : ''
  const direction = typeof result.direction === 'string' ? result.direction : ''
  // Never trust the model's own judgment of "ready" as license to skip
  // validating what it actually produced — same tolerance every other
  // model-output consumer in this codebase applies. An empty/missing field
  // here means the model set readyForRoadmap without real substance; skip
  // persisting rather than write a hollow Roadmap the person never
  // actually confirmed having.
  if (!currentFocus || !theme || !direction) return

  const suggestedSpaces = Array.isArray(result.suggestedSpaces)
    ? result.suggestedSpaces.filter((s): s is string => typeof s === 'string')
    : []

  const now = new Date().toISOString()
  const roadmapItem: RoadmapItem = {
    pk,
    sk: Sk.roadmap(),
    content: stubEncryptField<RoadmapContent>({ currentFocus, theme, direction, suggestedSpaces }),
    version: 1,
    updatedAt: now,
  }

  const currentFocusSignalId = randomUUID()
  const directionSignalId = randomUUID()
  const signals: TwinSignalItem[] = [
    {
      pk,
      sk: Sk.twinSignal('current_focus', currentFocusSignalId),
      signalId: currentFocusSignalId,
      domain: 'current_focus',
      status: 'confirmed',
      confidence: 1,
      source: 'onboarding',
      sourceSessionId: sessionId,
      content: stubEncryptField<{ description: string }>({ description: currentFocus }),
      createdAt: now,
      updatedAt: now,
    },
    {
      pk,
      sk: Sk.twinSignal('direction', directionSignalId),
      signalId: directionSignalId,
      domain: 'direction',
      status: 'confirmed',
      confidence: 1,
      source: 'onboarding',
      sourceSessionId: sessionId,
      content: stubEncryptField<{ description: string }>({ description: direction }),
      createdAt: now,
      updatedAt: now,
    },
  ]

  await Promise.all([
    ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: roadmapItem })),
    ...signals.map((item) => ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))),
  ])
}
