import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type SessionItem, type SessionMessageItem, type CompanionConversationsListResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto, type SessionCrypto } from '../lib/session-crypto'
import { maybeSetConversationTitle, deriveConversationTitle } from './session'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

type MessageContent = { text: string }
type TitleContent = { title: string }

/**
 * GET /v1/companion/conversations — Recent Conversations, newest first.
 * Same "no GSI, filter a broad prefix Query client-side" shape
 * `rooms/list-decisions.ts` already established for an analogous per-user
 * list: `SESSION#` also matches `#MSG#`/`#SUMMARY` sub-items, so only bare
 * session items (`sk.split('#').length === 2`) are kept, then filtered to
 * `roomType === 'companion'` (Rooms sessions share the same `SESSION#`
 * prefix and must not leak into this list).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const crypto = await getSessionCrypto(userId)

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'SESSION#' },
      })
    )
    const sessions = ((result.Items ?? []) as SessionItem[]).filter(
      (item) => item.sk.split('#').length === 2 && item.roomType === 'companion'
    )

    const conversations = await Promise.all(
      sessions.map(async (session) => ({
        sessionId: session.sessionId,
        title: await resolveTitle(crypto, pk, session),
        lastMessageAt: session.lastMessageAt ?? session.startedAt,
        createdAt: session.startedAt,
      }))
    )
    conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))

    const body: CompanionConversationsListResponse = { conversations }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * Lazy self-healing migration: every companion `SessionItem` created before
 * this feature shipped has no `title` — rather than a batch backfill
 * script, derive and persist it from that conversation's own first stored
 * message the first time it's listed (same `maybeSetConversationTitle`
 * write `message.ts` uses for a brand-new conversation's first turn, so
 * this can never race a title that a real turn is about to set). A
 * conversation with zero messages yet (just created, never sent to) has
 * nothing to derive from — returns `null`, the frontend shows a
 * placeholder label.
 */
async function resolveTitle(crypto: SessionCrypto, pk: string, session: SessionItem): Promise<string | null> {
  if (session.title) {
    return (await crypto.decryptField<TitleContent>(session.title)).title
  }

  const firstMessageResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': `SESSION#${session.sessionId}#MSG#` },
      Limit: 1,
    })
  )
  const first = (firstMessageResult.Items ?? [])[0] as SessionMessageItem | undefined
  if (!first) return null

  const { text } = await crypto.decryptField<MessageContent>(first.content)
  await maybeSetConversationTitle(ddb, TABLE_NAME, pk, session.sessionId, crypto, text)
  return deriveConversationTitle(text)
}
