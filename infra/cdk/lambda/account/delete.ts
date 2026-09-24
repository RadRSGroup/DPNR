import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, GlobalKeys, type DeleteAccountResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { batchDeleteKeys } from '../lib/batch-delete'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const SESSION_TICKETS_TABLE_NAME = process.env.SESSION_TICKETS_TABLE_NAME as string

/**
 * Queries every item under `pk` in `tableName` (paginated) and deletes it
 * via `batchDeleteKeys` (lib/batch-delete.ts) — shared between the application table and the
 * session-tickets table below, since both need the identical
 * query-then-batch-delete shape.
 */
async function deletePartition(tableName: string, pk: string): Promise<void> {
  const keys: { pk: string; sk: string }[] = []
  let exclusiveStartKey: Record<string, unknown> | undefined
  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk },
        ProjectionExpression: 'pk, sk',
        ExclusiveStartKey: exclusiveStartKey,
      })
    )
    keys.push(...((result.Items ?? []) as { pk: string; sk: string }[]))
    exclusiveStartKey = result.LastEvaluatedKey
  } while (exclusiveStartKey)

  await batchDeleteKeys(ddb, tableName, keys)
}

/**
 * DELETE /v1/account — see DeleteAccountResponseSchema's doc comment
 * (packages/shared-types/src/api/account.ts) for why this only deletes
 * DynamoDB state, not the Cognito user itself.
 *
 * Security review 2026-09-14 (DPNR-09): previously deleted only the
 * application table's USER#<id> partition. Session tickets live in a
 * genuinely separate table (`dpnr-session-tickets`, keyed by
 * GlobalKeys.sessionTicketPk(userId)) and were never touched here — the
 * frontend's own best-effort `revokeCurrentSessionTicket()` only ever knew
 * about the current tab's `active_session` ticket, never the `post_session`
 * one every login also creates (ADR 0013) or tickets from other
 * tabs/devices. Deleted here, server-side, before the caller's Cognito
 * identity is removed (the frontend calls this Lambda first, then
 * `CognitoUser.deleteUser()` — see apps/web/src/app/(app)/account/page.tsx's
 * `handleDelete`), so every one of this user's tickets is gone regardless
 * of which browser/tab created it, not just the one the current tab
 * happened to remember.
 *
 * Does NOT implement the report's fuller "auditable erasure workflow with
 * a request ID and status" recommendation — this stays a synchronous,
 * best-effort-complete delete across the two tables this account's data
 * actually lives in (the legacy Supabase plane the report also flagged
 * here no longer exists as of the S1 remediation slice). A real async
 * workflow with status tracking is a larger, separate feature, not
 * attempted here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    await deletePartition(SESSION_TICKETS_TABLE_NAME, GlobalKeys.sessionTicketPk(userId))
    await deletePartition(TABLE_NAME, userPk(userId))

    const response: DeleteAccountResponse = { deleted: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
