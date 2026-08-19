import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, CURRENT_CONSENT_VERSION, type ConsentResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * POST /v1/user/consent — the write path ADR 0004 anticipated but that
 * never got built against the new backend. Before this existed, nothing
 * could ever set `PROFILE.consentedAt` on the new DynamoDB item (the old
 * Supabase-era `apps/web` route only ever wrote to the retiring
 * `user_profiles` table), so `lib/consent.ts`'s `requireConsent()` would
 * 403 forever for any real signup — see docs/PHASE_AUDIT.md §2.2/§4.2.
 *
 * Idempotent by design: calling this again just re-confirms the current
 * version rather than erroring — consent isn't a one-time event a client
 * retry should be able to break.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const now = new Date().toISOString()

    const result = await ddb
      .send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { pk: userPk(userId), sk: Sk.profile() },
          // The profile must already exist (created by the Cognito
          // post-confirmation trigger) — a consent grant for a user with no
          // profile is a real inconsistency, not something to paper over by
          // creating one here.
          ConditionExpression: 'attribute_exists(pk)',
          UpdateExpression: 'SET consentedAt = :now, consentVersion = :v, updatedAt = :now',
          ExpressionAttributeValues: { ':now': now, ':v': CURRENT_CONSENT_VERSION },
          ReturnValues: 'ALL_NEW',
        })
      )
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
          throw new HttpError(404, 'profile_not_found', 'User profile does not exist.')
        }
        throw err
      })

    const response: ConsentResponse = {
      consentedAt: result.Attributes?.consentedAt as string,
      consentVersion: result.Attributes?.consentVersion as string,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
