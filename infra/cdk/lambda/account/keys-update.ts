import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, UpdateWrappedDekRequestSchema, type UpdateWrappedDekResponse } from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * PUT /v1/keys — updates an existing key bundle's DEK envelope after a
 * recovery-code-based account recovery (ADR 0014). Unlike POST /v1/keys
 * (one-time bootstrap), this requires an existing item — a "recovery" for a
 * user with no key bundle yet is a real inconsistency, not something to
 * paper over by creating one here. `salt`/`publicKey`/`wrappedPrivateKey`
 * never change (the DEK itself doesn't change on recovery — only which KEKs
 * wrap it), so only `wrappedDek`/`wrappedDekRecovery` are ever written here,
 * always together (the project's recovery-rotation decision: recovering via
 * the code always rotates it). The server never validates either
 * ciphertext's correctness, same trust model as every other write here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const body = parseBody(event, UpdateWrappedDekRequestSchema)

    await ddb
      .send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: userPk(userId), sk: Sk.keys() },
          ConditionExpression: 'attribute_exists(pk)',
          UpdateExpression: 'SET wrappedDek = :dek, wrappedDekRecovery = :dekRecovery',
          ExpressionAttributeValues: { ':dek': body.wrappedDek, ':dekRecovery': body.wrappedDekRecovery },
        })
      )
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
          throw new HttpError(404, 'keys_not_found', 'No key bundle exists for this user yet.')
        }
        throw err
      })

    const response: UpdateWrappedDekResponse = { ok: true }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
