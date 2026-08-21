import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  CompanionMessageRequestSchema,
  CompanionDirectiveSchema,
  type CompanionDirective,
  type CompanionMessageResponse,
  type SessionItem,
  type SessionMessageItem,
  type CompanionActiveSessionPointerItem,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { requireConsent } from '../lib/consent'
import { stubEncryptField, stubDecryptField } from '../lib/crypto-stub'
import { resolvePromptVersion } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { listActiveTopics } from '../lib/library-catalog'

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

type MessageContent = { text: string }

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

    const sessionId = await getOrCreateActiveCompanionSession(pk)
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
    const { reply, directive } = await callCompanionModel(history, body.text)

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

// Known, acceptable race: two concurrent first-messages from the same user
// (rare — effectively simultaneous requests before any session exists) could
// each miss the GetItem below and create two sessions; the second PutCommand
// on the pointer item wins, and the first session becomes an orphaned,
// harmless item. Not a correctness or security issue for a chat feature —
// worth a ConditionExpression + retry only if this ever shows up for real.
async function getOrCreateActiveCompanionSession(pk: string): Promise<string> {
  const pointerResult = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.companionActiveSession() } })
  )
  const pointer = pointerResult.Item as CompanionActiveSessionPointerItem | undefined
  if (pointer) return pointer.sessionId

  const sessionId = randomUUID()
  const now = new Date().toISOString()
  const session: SessionItem = {
    pk,
    sk: Sk.session(sessionId),
    sessionId,
    roomType: 'companion',
    status: 'active',
    sessionVersion: 0,
    startedAt: now,
  }
  const pointerItem: CompanionActiveSessionPointerItem = {
    pk,
    sk: Sk.companionActiveSession(),
    sessionId,
    updatedAt: now,
  }
  await Promise.all([
    ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: session })),
    ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: pointerItem })),
  ])
  return sessionId
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
 */
async function callCompanionModel(
  history: CompanionTurn[],
  userText: string
): Promise<{ reply: string; directive: CompanionDirective | null }> {
  const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'companion', 'respond')
  const topics = await listActiveTopics(ddb, LIBRARY_CATALOG_TABLE_NAME)

  const conversationHistory =
    history.length > 0
      ? history.map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.text}`).join('\n')
      : '(no prior messages — this is the start of the conversation)'
  const libraryTopics =
    topics.length > 0 ? topics.map((t) => `- ${t.slug}: ${t.title}`).join('\n') : '(none available)'

  const result = await callPromptModel(version, {
    conversationHistory,
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
