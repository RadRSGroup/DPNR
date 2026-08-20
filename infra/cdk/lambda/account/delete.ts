import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, BatchWriteCommand, type BatchWriteCommandInput } from '@aws-sdk/lib-dynamodb'

type WriteRequests = NonNullable<BatchWriteCommandInput['RequestItems']>[string]
import { userPk, type DeleteAccountResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const BATCH_WRITE_LIMIT = 25 // DynamoDB's own per-BatchWriteItem-call limit
const MAX_UNPROCESSED_RETRIES = 5

/**
 * DELETE /v1/account — see DeleteAccountResponseSchema's doc comment
 * (packages/shared-types/src/api/account.ts) for why this only deletes the
 * DynamoDB partition, not the Cognito user itself.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const keys: { pk: string; sk: string }[] = []
    let exclusiveStartKey: Record<string, unknown> | undefined
    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
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
        const result = await ddb.send(new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: requestItems } }))
        requestItems = result.UnprocessedItems?.[TABLE_NAME] ?? []
      }
      if (requestItems.length > 0) {
        // Deliberately only the count, never key contents — sk values can embed
        // ids but never raw personal content, still err on the side documented
        // in the "no raw payloads in logs" guardrail.
        throw new Error(`Failed to delete ${requestItems.length} item(s) after ${MAX_UNPROCESSED_RETRIES} retries.`)
      }
    }

    const response: DeleteAccountResponse = { deleted: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
