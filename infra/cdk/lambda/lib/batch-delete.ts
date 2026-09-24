import { BatchWriteCommand, type BatchWriteCommandInput, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

type WriteRequests = NonNullable<BatchWriteCommandInput['RequestItems']>[string]

const BATCH_WRITE_LIMIT = 25 // DynamoDB's own per-BatchWriteItem-call limit
const MAX_UNPROCESSED_RETRIES = 5

/**
 * Deletes `keys` from `tableName` in batches of 25, retrying
 * `UnprocessedItems` up to `MAX_UNPROCESSED_RETRIES` times per batch, and
 * throws (rather than reporting a false success) if anything is still left
 * after that. Extracted from `account/delete.ts` so a second caller
 * (`companion/delete-conversation.ts`) gets the identical retry behavior
 * instead of a re-implementation.
 */
export async function batchDeleteKeys(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  keys: { pk: string; sk: string }[]
): Promise<void> {
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
