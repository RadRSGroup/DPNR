import { randomUUID } from 'node:crypto'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type SessionItem, type CompanionActiveSessionPointerItem, type InteractionMode } from '@dpnr/shared-types'

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
