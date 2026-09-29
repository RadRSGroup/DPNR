import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { userPk, type EncryptedBlob, type UserExportResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'

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
    const crypto = await getSessionCrypto(userId, 'active_session')

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

    const exportedItems = await Promise.all(
      items.map(async ({ pk: _pk, content, translated, ...rest }) => ({
        ...rest,
        ...(content !== undefined
          ? { content: isEncryptedBlob(content) ? await crypto.decryptField<unknown>(content) : content }
          : {}),
        // A stored translation of AI text (lib/relocalize.ts), decrypted
        // like `content` so the export stays readable.
        ...(translated && typeof translated === 'object' && isEncryptedBlob((translated as { content?: unknown }).content)
          ? {
              translated: {
                lang: (translated as { lang?: unknown }).lang,
                content: await crypto.decryptField<unknown>((translated as { content: EncryptedBlob }).content),
              },
            }
          : {}),
      }))
    )

    const response: UserExportResponse = {
      exportedAt: new Date().toISOString(),
      items: exportedItems as UserExportResponse['items'],
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
