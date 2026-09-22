import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand, type BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

type WriteRequests = NonNullable<BatchWriteCommandInput['RequestItems']>[string]
import { userPk, GlobalKeys, type DeleteAccountResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const SESSION_TICKETS_TABLE_NAME = process.env.SESSION_TICKETS_TABLE_NAME as string
const BATCH_WRITE_LIMIT = 25 // DynamoDB's own per-BatchWriteItem-call limit
const MAX_UNPROCESSED_RETRIES = 5

/**
 * Queries every item under `pk` in `tableName` (paginated) and deletes it in
 * batches, retrying `UnprocessedItems` up to `MAX_UNPROCESSED_RETRIES`
 * times per batch — shared between the application table and the
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

  for (let i = 0; i < keys.length; i += BATCH_WRITE_LIMIT) {
    let requestItems: WriteRequests = keys
      .slice(i, i + BATCH_WRITE_LIMIT)
      .map((key) => ({ DeleteRequest: { Key: key } }))

    for (let attempt = 0; requestItems.length > 0 && attempt < MAX_UNPROCESSED_RETRIES; attempt++) {
      const result = await ddb.send(new BatchWriteCommand({ RequestItems: { [tableName]: requestItems } }))
      requestItems = result.UnprocessedItems?.[tableName] ?? []
    }
    if (requestItems.length > 0) {
      // Deliberately only the count, never key contents — sk values can embed
      // ids but never raw personal content, still err on the side documented
      // in the "no raw payloads in logs" guardrail.
      throw new Error(`Failed to delete ${requestItems.length} item(s) from ${tableName} after ${MAX_UNPROCESSED_RETRIES} retries.`)
    }
  }
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
