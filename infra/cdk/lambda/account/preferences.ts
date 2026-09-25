import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, UpdatePreferencesRequestSchema, type PreferencesResponse } from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getAvatarPresignedUrl } from '../lib/avatar'
import { getChatBackgroundPresignedUrl } from '../lib/chat-background'
import { getVisionRemaining } from '../lib/vision-quota'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * PUT /v1/user/preferences — the write path `preferredLanguage`/
 * `genderIdentity` never had (docs/HEBREW_LOCALIZATION_PLAN.md Slice B),
 * extended in Session 51 for `avatarKey`/`profileSetupComplete` (the
 * dedicated post-signin profile-setup screen). Same shape as `consent.ts`'s
 * already-established write-path pattern: requires an existing PROFILE
 * item (created by the post-confirmation trigger), never creates one. Only
 * the fields present in the request are updated — the Zod schema's
 * `.refine()` already rejects an empty body before this handler runs.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { preferredLanguage, genderIdentity, firstName, avatarKey, profileSetupComplete, chatBackground, chatBackgroundKey } =
      parseBody(event, UpdatePreferencesRequestSchema)
    // Ownership check: both keys are only ever issued under the caller's own
    // prefix (avatar-upload-url.ts / chat-background-upload-url.ts /
    // vision-worker.ts). Without this, a caller could store another user's
    // object key and receive a presigned read URL for it on the next read.
    assertOwnKey(avatarKey, `avatars/${userId}/`)
    assertOwnKey(chatBackgroundKey, `chat-backgrounds/${userId}/`)
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
    if (firstName !== undefined) {
      setClauses.push('firstName = :firstName')
      values[':firstName'] = firstName ? firstName : null
    }
    if (avatarKey !== undefined) {
      setClauses.push('avatarKey = :avatarKey')
      values[':avatarKey'] = avatarKey
    }
    if (profileSetupComplete) {
      setClauses.push('profileSetupCompletedAt = :profileSetupCompletedAt')
      values[':profileSetupCompletedAt'] = now
    }
    if (chatBackground !== undefined) {
      setClauses.push('chatBackground = :chatBackground')
      values[':chatBackground'] = chatBackground
    }
    if (chatBackgroundKey !== undefined) {
      setClauses.push('chatBackgroundKey = :chatBackgroundKey')
      values[':chatBackgroundKey'] = chatBackgroundKey
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
      firstName: (result.Attributes?.firstName as string | null | undefined) ?? null,
      avatarUrl: await getAvatarPresignedUrl(result.Attributes?.avatarKey as string | null | undefined),
      profileSetupCompletedAt: (result.Attributes?.profileSetupCompletedAt as string | null | undefined) ?? null,
      chatBackground: (result.Attributes?.chatBackground as PreferencesResponse['chatBackground']) ?? 'digital_twin',
      chatBackgroundUrl: await getChatBackgroundPresignedUrl(result.Attributes?.chatBackgroundKey as string | null | undefined),
      visionRemainingThisMonth: await getVisionRemaining(ddb, TABLE_NAME, userPk(userId)),
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}

function assertOwnKey(key: string | null | undefined, ownPrefix: string): void {
  if (key === undefined || key === null) return
  if (!key.startsWith(ownPrefix) || key.includes('..')) {
    throw new HttpError(400, 'validation_error', 'That image does not belong to this account.')
  }
}
