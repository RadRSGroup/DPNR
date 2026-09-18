import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type UserProfileItem, type PreferencesResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getAvatarPresignedUrl } from '../lib/avatar'
import { getChatBackgroundPresignedUrl } from '../lib/chat-background'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/user/preferences — the read half of Slice B's `preferredLanguage`/
 * `genderIdentity` pair (docs/HEBREW_LOCALIZATION_PLAN.md). Exists
 * specifically so the Account settings page can show the caller's actual
 * stored gender selection before they touch anything — the app's own
 * "honest state, never fabricate a default the user hasn't actually
 * chosen" convention (see e.g. Dashboard's empty-state cards) applies just
 * as much to a settings toggle as to a stat card. Reuses the same response
 * shape as the PUT endpoint since both describe the identical two fields.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.profile() } })
    )
    if (!result.Item) {
      throw new HttpError(404, 'profile_not_found', 'User profile does not exist.')
    }
    const profile = result.Item as UserProfileItem
    const response: PreferencesResponse = {
      preferredLanguage: profile.preferredLanguage,
      genderIdentity: profile.genderIdentity,
      avatarUrl: await getAvatarPresignedUrl(profile.avatarKey),
      profileSetupCompletedAt: profile.profileSetupCompletedAt,
      chatBackground: profile.chatBackground,
      chatBackgroundUrl: await getChatBackgroundPresignedUrl(profile.chatBackgroundKey),
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
