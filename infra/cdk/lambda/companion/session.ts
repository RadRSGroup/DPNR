import { randomUUID } from 'node:crypto'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type SessionItem, type CompanionActiveSessionPointerItem } from '@dpnr/shared-types'

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
