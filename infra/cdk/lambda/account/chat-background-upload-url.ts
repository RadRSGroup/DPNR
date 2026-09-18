import { randomUUID } from 'node:crypto'
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ChatBackgroundUploadUrlRequestSchema, type ChatBackgroundUploadUrlResponse } from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse } from '../lib/http'

const s3 = new S3Client({})
const BUCKET_NAME = process.env.AVATARS_BUCKET_NAME as string
const UPLOAD_URL_EXPIRY_SECONDS = 300

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * POST /v1/user/chat-background/upload-url — Main Chat UX Update's
 * previously-deferred custom background (`docs/AGENT_LOG.md`). Structurally
 * identical to `avatar-upload-url.ts` — same private `AvatarsBucket`
 * (`data-stack.ts`), a `chat-backgrounds/` key prefix instead of `avatars/`
 * so this Lambda never sees or collides with actual profile-photo objects.
 * Issuing this URL does not attach anything to the profile — the caller
 * must still PUT the bytes, then send `key` to `PUT /v1/user/preferences`'s
 * `chatBackgroundKey` field (alongside `chatBackground: 'custom'`) to
 * actually make it the account's chat background.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { contentType } = parseBody(event, ChatBackgroundUploadUrlRequestSchema)
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType]

    const key = `chat-backgrounds/${userId}/${randomUUID()}.${extension}`
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_EXPIRY_SECONDS }
    )

    const response: ChatBackgroundUploadUrlResponse = { uploadUrl, key }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
