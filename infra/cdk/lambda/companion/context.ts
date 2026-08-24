import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  type SessionMessageItem,
  type CompanionActiveSessionPointerItem,
  type CompanionContextResponse,
  type DailyCardItem,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubEncryptField, stubDecryptField } from '../lib/crypto-stub'
import { resolvePromptVersion } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { gatherContinuityContext } from '../continuity/gather-context'
import { roadmapExists } from '../lib/roadmap'
import { getOrCreateActiveCompanionSession } from './session'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

// Full chat-resume view for the client — a different concern from
// message.ts's MODEL_CONTEXT_MESSAGES (which bounds the future model
// call's context budget), so intentionally not shared.
const CONTEXT_MESSAGE_LIMIT = 50

// How long since the last stored message before this counts as a real
// "return" worth a synthesized opener, vs. the person just reloading the
// page mid-conversation. An unconfirmed placeholder, same status as
// STARTER_TRIAL_CREDITS/the fixed 06:00 UTC Continuity schedule — flag for
// product review, don't treat as final.
const CONTINUATION_GAP_HOURS = 3
const CONTINUATION_MODEL_HISTORY_TURNS = 6

type MessageContent = { text: string }

/**
 * GET /v1/companion/context — recent turns for resuming a chat. Read-only
 * over the caller's own data; no consent gate, same reasoning as the
 * Dashboard handler (see lib/consent.ts's doc comment) — synthesizing a
 * continuation from the person's own already-stored data (their own chat
 * history, their own confirmed Twin signals) is "reading it back to them,"
 * not new personal-content processing, same category `library/topic-detail.ts`'s
 * personalization already established for a GET endpoint that calls a model.
 *
 * Session 14 (workstream C, part 1 — docs/PHASE_AUDIT.md §4.6): when the
 * gap since the last stored message meets CONTINUATION_GAP_HOURS, this
 * synthesizes a short "welcome back" opener (the `companion/continuation`
 * prompt) and persists it as a real assistant turn before returning —
 * exactly what the spec's Golden Path B step 2 ("Companion opens with a
 * relevant continuation") asks for, requiring zero frontend change since
 * the Companion page already renders whatever's in `messages`.
 *
 * Session 15 (workstream D): a truly brand-new user (no session pointer
 * *and* no Roadmap yet) gets the mirror-image treatment — the very first
 * onboarding question, synthesized via `companion/onboard` with empty
 * history and persisted the same way, so the person sees a real orienting
 * question the instant they open Companion rather than a blank state.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const pointerResult = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.companionActiveSession() } })
    )
    const pointer = pointerResult.Item as CompanionActiveSessionPointerItem | undefined
    if (!pointer) {
      if (await roadmapExists(ddb, TABLE_NAME, pk)) {
        // Has a Roadmap already but no active session pointer — an edge
        // case (e.g. a manual data reset), not a brand-new user. Nothing
        // to continue from and onboarding is already done; plain empty
        // state, same as before this session.
        const body: CompanionContextResponse = { sessionId: null, messages: [], dailyCard: await getUndismissedDailyCard(pk) }
        return jsonResponse(200, body)
      }

      const sessionId = await getOrCreateActiveCompanionSession(ddb, TABLE_NAME, pk)
      const opener = await synthesizeOnboardingOpener(pk, sessionId)
      const body: CompanionContextResponse = {
        sessionId,
        messages: opener ? [opener] : [],
        dailyCard: await getUndismissedDailyCard(pk),
      }
      return jsonResponse(200, body)
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': Sk.sessionMessage(pointer.sessionId, '') },
        // Fetch the most recent CONTEXT_MESSAGE_LIMIT (not the oldest) — a
        // resume view needs the tail of a long session, not its start.
        ScanIndexForward: false,
        Limit: CONTEXT_MESSAGE_LIMIT,
      })
    )
    const items = ((result.Items ?? []) as SessionMessageItem[]).reverse() // back to chronological order

    const messages = items.map((m) => ({
      role: m.role,
      text: stubDecryptField<MessageContent>(m.content).text,
      createdAt: m.createdAt,
    }))

    const continuation = await maybeSynthesizeContinuation(userId, pk, pointer.sessionId, messages)
    if (continuation) messages.push(continuation)

    const body: CompanionContextResponse = {
      sessionId: pointer.sessionId,
      messages,
      dailyCard: await getUndismissedDailyCard(pk),
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * Today's Daily Card, if one exists and hasn't been dismissed — spec §3/§4's
 * "Dashboard + Main Chat" dual surface for Daily Card (see the response
 * schema's own doc comment). A plain read, no model call, so failures here
 * degrade to `null` rather than breaking context resume.
 */
async function getUndismissedDailyCard(pk: string): Promise<CompanionContextResponse['dailyCard']> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.dailyCard(today) } }))
    const item = result.Item as DailyCardItem | undefined
    if (!item || item.dismissedAt) return null

    const { text, kind } = stubDecryptField<{ text: string; kind: 'thought' | 'question' | 'reminder' | 'micro_practice' }>(
      item.content
    )
    return { kind, text, feedback: item.feedback ?? null }
  } catch {
    return null
  }
}

/**
 * Returns a freshly-synthesized-and-persisted continuation turn, or `null`
 * if it's not time for one yet, there's nothing to resume from, or
 * synthesis fails for any reason — this must never break a plain context
 * read. Writing from inside a GET is a deliberate, narrow exception (see
 * the handler's own doc comment); the read-modify-write below has the same
 * "known, acceptable race" shape `message.ts`'s `getOrCreateActiveCompanionSession`
 * already accepts — two near-simultaneous opens could each synthesize their
 * own opener, which is a harmless double greeting, not a correctness issue,
 * and self-limits immediately after (the fresh `createdAt` resets the gap).
 */
async function maybeSynthesizeContinuation(
  userId: string,
  pk: string,
  sessionId: string,
  messages: { role: 'user' | 'assistant'; text: string; createdAt: string }[]
): Promise<{ role: 'assistant'; text: string; createdAt: string } | null> {
  if (messages.length === 0) return null

  const lastMessage = messages[messages.length - 1]
  const gapMs = Date.now() - new Date(lastMessage.createdAt).getTime()
  if (gapMs < CONTINUATION_GAP_HOURS * 60 * 60 * 1000) return null

  try {
    const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'companion', 'continuation')
    const { confirmedSignals, sessionSummaries } = await gatherContinuityContext(userId)

    const recentConversation = messages
      .slice(-CONTINUATION_MODEL_HISTORY_TURNS)
      .map((m) => `${m.role === 'user' ? 'User' : 'Companion'}: ${m.text}`)
      .join('\n')
    const confirmedSignalsList =
      confirmedSignals.length > 0
        ? confirmedSignals
            .slice(0, 5)
            .map((s) => `- (${s.domain}) ${s.description}`)
            .join('\n')
        : '(none yet)'
    const recentSessionSummaries =
      sessionSummaries.length > 0
        ? sessionSummaries
            .slice(0, 3)
            .map((s) => `- ${s.summary}`)
            .join('\n')
        : '(none yet)'

    const result = await callPromptModel(version, {
      recentConversation,
      confirmedSignalsList,
      recentSessionSummaries,
    })
    const text = typeof result === 'string' ? result.trim() : ''
    if (!text) return null

    const now = new Date().toISOString()
    const item: SessionMessageItem = {
      pk,
      sk: Sk.sessionMessage(sessionId, now),
      role: 'assistant',
      content: stubEncryptField<MessageContent>({ text }),
      createdAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))

    return { role: 'assistant', text, createdAt: now }
  } catch (err) {
    // Never let a continuation-synthesis failure break a plain context
    // read — same tolerance twin-signals.ts and topic-detail.ts's
    // personalization already use for their own model output. Log only a
    // generic message — never the model result or gathered content, per
    // the "no raw payloads in logs" guardrail. `prompt_not_found` (the
    // `companion` domain not seeded with `continuation` yet) is expected
    // during rollout, not worth logging as an error.
    if (!(err instanceof HttpError && err.code === 'prompt_not_found')) {
      console.error('Companion continuation synthesis failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    }
    return null
  }
}

/**
 * The very first thing a brand-new user ever sees in Companion — the
 * opening turn of onboarding (spec Golden Path A step 5), synthesized via
 * the same `companion/onboard` prompt `message.ts`'s `runOnboardingTurn`
 * uses for every later turn, just with empty history and a sentinel
 * "nothing said yet" current-message. Deliberately ignores `readyForRoadmap`
 * even if the model somehow set it on this first call — persisting a
 * Roadmap is `message.ts`'s job, from a real reply to a real question,
 * never from this opener alone.
 */
async function synthesizeOnboardingOpener(
  pk: string,
  sessionId: string
): Promise<{ role: 'assistant'; text: string; createdAt: string } | null> {
  try {
    const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'companion', 'onboard')
    const result = await callPromptModel(version, {
      conversationHistory: '(no prior messages — this is the start of the conversation)',
      currentMessage:
        "(the person has just opened Companion for the very first time and hasn't said anything yet — introduce yourself briefly and ask your first orienting question)",
      conclusionInstruction: '',
    })
    const text = typeof result === 'string' ? '' : typeof result.reply === 'string' ? result.reply.trim() : ''
    if (!text) return null

    const now = new Date().toISOString()
    const item: SessionMessageItem = {
      pk,
      sk: Sk.sessionMessage(sessionId, now),
      role: 'assistant',
      content: stubEncryptField<MessageContent>({ text }),
      createdAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))

    return { role: 'assistant', text, createdAt: now }
  } catch (err) {
    if (!(err instanceof HttpError && err.code === 'prompt_not_found')) {
      console.error('Onboarding opener synthesis failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    }
    return null
  }
}
