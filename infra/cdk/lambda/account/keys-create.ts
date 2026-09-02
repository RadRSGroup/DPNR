import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  UserKeysRequestSchema,
  type UserKeysItem,
  type UserKeysResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/keys — one-time key bootstrap. The client generates every field
 * locally (salt, wrapped DEK, wrapped-DEK-recovery, X25519 keypair) and
 * uploads only ciphertext/public material — this Lambda never sees a raw
 * key. A DEK is generated once at signup and never regenerated (regenerating
 * it would orphan every already-encrypted field, see
 * apps/web/src/lib/crypto/dek.ts), so a second call for the same user 409s
 * rather than silently overwriting.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const body = parseBody(event, UserKeysRequestSchema)
    const now = new Date().toISOString()

    const item: UserKeysItem = {
      pk: userPk(userId),
      sk: Sk.keys(),
      salt: body.salt,
      wrappedDek: body.wrappedDek,
      wrappedDekRecovery: body.wrappedDekRecovery,
      publicKey: body.publicKey,
      wrappedPrivateKey: body.wrappedPrivateKey,
      createdAt: now,
    }

    await ddb
      .send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression: 'attribute_not_exists(pk)',
        })
      )
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
          throw new HttpError(409, 'keys_already_exist', 'A key bundle already exists for this user.')
        }
        throw err
      })

    const response: UserKeysResponse = {
      salt: item.salt,
      wrappedDek: item.wrappedDek,
      wrappedDekRecovery: item.wrappedDekRecovery,
      publicKey: item.publicKey,
      wrappedPrivateKey: item.wrappedPrivateKey,
    }
    return jsonResponse(201, response)
  } catch (err) {
    return errorResponse(err)
  }
}
