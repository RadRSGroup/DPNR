import { randomUUID } from 'node:crypto'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type SessionItem, type CompanionActiveSessionPointerItem, type InteractionMode } from '@dpnr/shared-types'
import { HttpError } from '../lib/http'
import type { SessionCrypto } from '../lib/session-crypto'

// Word-boundary-aware truncation, not a hard character cut — a title
// ending mid-word ("...how are yo…") reads as broken in a way a
// word-boundary cut doesn't. Zero-cost (no model call); an unconfirmed
// placeholder, same status as this file's own CONTINUATION_GAP_HOURS-style
// constants elsewhere in Companion — swap for an LLM-generated title later
// without a storage-shape change if this reads too plainly.
const TITLE_MAX_CHARS = 40

export function deriveConversationTitle(firstUserMessageText: string): string {
  const trimmed = firstUserMessageText.trim()
  if (trimmed.length <= TITLE_MAX_CHARS) return trimmed
  const cut = trimmed.slice(0, TITLE_MAX_CHARS)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 10 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

/**
 * Shared by `message.ts` (every real chat turn) and, since Session 15's
 * onboarding work, `context.ts` (which now needs to create the very first
 * session itself, to persist a brand-new user's synthesized opening
 * question before they've typed anything). Extracted out of `message.ts`
 * rather than duplicated.
 *
 * Known, acceptable race: two concurrent first-opens from the same user
 * (rare — effectively simultaneous requests before any session exists)
 * could each miss the GetItem below and create two sessions; the second
 * PutCommand on the pointer item wins, and the first session becomes an
 * orphaned, harmless item. Not a correctness or security issue for a chat
 * feature — worth a ConditionExpression + retry only if this ever shows up
 * for real.
 */
export async function getOrCreateActiveCompanionSession(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<string> {
  const pointerResult = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.companionActiveSession() } })
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
    ddb.send(new PutCommand({ TableName: tableName, Item: session })),
    ddb.send(new PutCommand({ TableName: tableName, Item: pointerItem })),
  ])
  return sessionId
}

/**
 * Discrete conversations: resolves which SessionItem a message/context
 * request targets. `requestedSessionId` present → ownership+type-checked
 * `GetItem` (404 if missing or not a companion session — never silently
 * fall back, that would write into the wrong conversation); absent →
 * today's pointer-based behavior via `getOrCreateActiveCompanionSession`.
 * Also re-points the pointer at the requested session, same as switching
 * tabs in any chat app — so a plain `GET /context` (no sessionId) later
 * resumes wherever the user last had open, not wherever they started.
 */
export async function resolveOrCreateSession(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  requestedSessionId?: string
): Promise<string> {
  if (!requestedSessionId) {
    return getOrCreateActiveCompanionSession(ddb, tableName, pk)
  }

  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.session(requestedSessionId) } }))
  const session = result.Item as SessionItem | undefined
  if (!session || session.roomType !== 'companion') {
    throw new HttpError(404, 'conversation_not_found', 'No such conversation.')
  }

  await ddb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk, sk: Sk.companionActiveSession() },
      UpdateExpression: 'SET sessionId = :sid, updatedAt = :now',
      ExpressionAttributeValues: { ':sid': requestedSessionId, ':now': new Date().toISOString() },
    })
  )
  return requestedSessionId
}

/**
 * Starts a brand-new, empty conversation and makes it the caller's open
 * one — the explicit "New conversation" action, as opposed to
 * `getOrCreateActiveCompanionSession`'s implicit "there wasn't one yet."
 */
export async function createConversation(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<string> {
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
    ddb.send(new PutCommand({ TableName: tableName, Item: session })),
    ddb.send(new PutCommand({ TableName: tableName, Item: pointerItem })),
  ])
  return sessionId
}

/**
 * Intelligence Spec §17 — records the just-classified Current Interaction
 * Mode onto the active session's pointer item. Best-effort: a failed write
 * here must never break the chat turn it's attached to, same tolerance
 * every other non-essential side-write in this codebase gets (e.g.
 * lib/safety.ts's persistSafetyEvent).
 */
export async function updateSessionInteractionMode(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  mode: InteractionMode
): Promise<void> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.companionActiveSession() },
        UpdateExpression: 'SET currentInteractionMode = :mode, updatedAt = :now',
        ExpressionAttributeValues: { ':mode': mode, ':now': new Date().toISOString() },
      })
    )
  } catch (err) {
    console.error('Failed to update currentInteractionMode (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}

/**
 * Recent Conversations' sort key. Best-effort, same non-fatal tolerance as
 * `updateSessionInteractionMode` above — a failed touch just means this
 * conversation sorts slightly stale in the list next load, never a broken
 * chat turn.
 */
export async function touchSessionLastMessage(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  sessionId: string
): Promise<void> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.session(sessionId) },
        UpdateExpression: 'SET lastMessageAt = :now',
        ExpressionAttributeValues: { ':now': new Date().toISOString() },
      })
    )
  } catch (err) {
    console.error('Failed to update lastMessageAt (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}

/**
 * Sets a conversation's title from its own first user message — only if
 * one isn't already set (`ConditionExpression`, not a pre-read: cheaper,
 * and race-safe if two turns somehow landed close together). The expected
 * `ConditionalCheckFailedException` on every later message is not an
 * error, just "nothing to do" — only genuinely unexpected failures get
 * logged, same as every other best-effort side-write in this file.
 */
export async function maybeSetConversationTitle(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  sessionId: string,
  crypto: SessionCrypto,
  firstUserMessageText: string
): Promise<void> {
  try {
    const title = await crypto.encryptField<{ title: string }>({ title: deriveConversationTitle(firstUserMessageText) })
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk, sk: Sk.session(sessionId) },
        UpdateExpression: 'SET title = :title',
        ConditionExpression: 'attribute_not_exists(title)',
        ExpressionAttributeValues: { ':title': title },
      })
    )
  } catch (err) {
    if (!(err instanceof Error && err.name === 'ConditionalCheckFailedException')) {
      console.error('Failed to set conversation title (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    }
  }
}
