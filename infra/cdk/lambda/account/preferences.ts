import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, UpdatePreferencesRequestSchema, type PreferencesResponse } from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * PUT /v1/user/preferences — the write path `preferredLanguage`/
 * `genderIdentity` never had (docs/HEBREW_LOCALIZATION_PLAN.md Slice B).
 * Same shape as `consent.ts`'s already-established write-path pattern:
 * requires an existing PROFILE item (created by the post-confirmation
 * trigger), never creates one. Only the fields present in the request are
 * updated — the Zod schema's `.refine()` already rejects an empty body
 * before this handler runs.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { preferredLanguage, genderIdentity } = parseBody(event, UpdatePreferencesRequestSchema)
    const now = new Date().toISOString()

    const setClauses = ['updatedAt = :now']
    const values: Record<string, unknown> = { ':now': now }
    if (preferredLanguage !== undefined) {
      setClauses.push('preferredLanguage = :lang')
      values[':lang'] = preferredLanguage
    }
    if (genderIdentity !== undefined) {
      setClauses.push('genderIdentity = :gender')
      values[':gender'] = genderIdentity
    }

    const result = await ddb
      .send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: userPk(userId), sk: Sk.profile() },
          ConditionExpression: 'attribute_exists(pk)',
          UpdateExpression: `SET ${setClauses.join(', ')}`,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        })
      )
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
          throw new HttpError(404, 'profile_not_found', 'User profile does not exist.')
        }
        throw err
      })

    const response: PreferencesResponse = {
      preferredLanguage: result.Attributes?.preferredLanguage as PreferencesResponse['preferredLanguage'],
      genderIdentity: result.Attributes?.genderIdentity as PreferencesResponse['genderIdentity'],
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
