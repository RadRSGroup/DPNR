import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type EncryptedBlob, type UserExportResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  return typeof value === 'object' && value !== null && typeof (value as { ciphertext?: unknown }).ciphertext === 'string'
}

/**
 * GET /v1/user/export — see UserExportResponseSchema's doc comment
 * (packages/shared-types/src/api/account.ts) for why this is a flat,
 * whole-partition dump rather than a hand-curated per-feature shape.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const items: Record<string, unknown>[] = []
    let exclusiveStartKey: Record<string, unknown> | undefined
    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': pk },
          ExclusiveStartKey: exclusiveStartKey,
        })
      )
      items.push(...((result.Items ?? []) as Record<string, unknown>[]))
      exclusiveStartKey = result.LastEvaluatedKey
    } while (exclusiveStartKey)

    const exportedItems = items.map(({ pk: _pk, content, ...rest }) => ({
      ...rest,
      ...(content !== undefined
        ? { content: isEncryptedBlob(content) ? stubDecryptField<unknown>(content) : content }
        : {}),
    }))

    const response: UserExportResponse = {
      exportedAt: new Date().toISOString(),
      items: exportedItems as UserExportResponse['items'],
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
