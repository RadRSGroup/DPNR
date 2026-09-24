import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import {
  userPk,
  Sk,
  type SessionItem,
  type CompanionActiveSessionPointerItem,
  type CompanionDeleteConversationResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { batchDeleteKeys } from '../lib/batch-delete'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * DELETE /v1/companion/conversations/{sessionId} — permanently deletes one
 * of the caller's own Companion conversations: the `SESSION#<id>` item and
 * every `SESSION#<id>#…` item under it (messages, summary).
 *
 * Ownership is structural (the key is built from the caller's own JWT
 * `sub`, never from input), and the session must exist AND be a companion
 * session — a Room session shares the `SESSION#` prefix and must never be
 * deletable through this route (404, same as a missing one, so this can't
 * be used to probe which Room session ids exist).
 *
 * If the active-session pointer points at the deleted conversation, the
 * pointer is removed too, so a later plain `GET /v1/companion/context`
 * doesn't resolve to a conversation that no longer exists; the client uses
 * `wasActive` to switch to another conversation or start a new one.
 *
 * Deliberately NOT deleted: records derived from the conversation that
 * live on their own (open threads, Twin signals — each managed from its own
 * surface) and safety events, which are an audit trail and must not be
 * erasable from the chat UI. Full account deletion (`account/delete.ts`)
 * still removes everything.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const sessionId = event.pathParameters?.sessionId
    if (!sessionId) throw new HttpError(400, 'validation_error', 'Missing conversation id.')

    const sessionResult = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.session(sessionId) } }))
    const session = sessionResult.Item as SessionItem | undefined
    if (!session || session.roomType !== 'companion') {
      throw new HttpError(404, 'conversation_not_found', 'No such conversation.')
    }

    // Children first, the session item last — if anything fails midway the
    // conversation still exists and can simply be deleted again.
    const childKeys: { pk: string; sk: string }[] = []
    let exclusiveStartKey: Record<string, unknown> | undefined
    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
          // Trailing '#' so SESSION#<id> can never prefix-match another id.
          ExpressionAttributeValues: { ':pk': pk, ':prefix': `${Sk.session(sessionId)}#` },
          ProjectionExpression: 'pk, sk',
          ExclusiveStartKey: exclusiveStartKey,
        })
      )
      childKeys.push(...((result.Items ?? []) as { pk: string; sk: string }[]))
      exclusiveStartKey = result.LastEvaluatedKey
    } while (exclusiveStartKey)

    await batchDeleteKeys(ddb, TABLE_NAME, childKeys)
    await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.session(sessionId) } }))

    const pointerResult = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.companionActiveSession() } })
    )
    const pointer = pointerResult.Item as CompanionActiveSessionPointerItem | undefined
    const wasActive = pointer?.sessionId === sessionId
    if (wasActive) {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk, sk: Sk.companionActiveSession() },
          // Only if it still points here — a concurrent switch to another
          // conversation must not be undone by this delete.
          ConditionExpression: 'sessionId = :sid',
          ExpressionAttributeValues: { ':sid': sessionId },
        })
      ).catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err
      })
    }

    const body: CompanionDeleteConversationResponse = { deleted: true, wasActive }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
