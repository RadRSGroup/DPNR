import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserKeysItem, type UserKeysResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/keys — the crypto envelope a returning client needs to re-derive
 * its DEK locally. Never decrypted server-side (packages/shared-types/src/api/account.ts).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.keys() } })
    )
    if (!result.Item) {
      throw new HttpError(404, 'keys_not_found', 'No key bundle exists for this user yet.')
    }
    const item = result.Item as UserKeysItem
    const response: UserKeysResponse = {
      salt: item.salt,
      wrappedDek: item.wrappedDek,
      wrappedDekRecovery: item.wrappedDekRecovery,
      publicKey: item.publicKey,
      wrappedPrivateKey: item.wrappedPrivateKey,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
