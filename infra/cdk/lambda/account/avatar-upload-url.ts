import { randomUUID } from 'node:crypto'
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { AvatarUploadUrlRequestSchema, type AvatarUploadUrlResponse } from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse } from '../lib/http'

// WHEN_REQUIRED: newer SDK versions otherwise sign a CRC32 checksum of the
// (empty) body into the presigned PUT URL (`x-amz-checksum-crc32=AAAAAA==`),
// so S3 rejects the real image bytes the browser sends later.
const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' })
const BUCKET_NAME = process.env.AVATARS_BUCKET_NAME as string
const UPLOAD_URL_EXPIRY_SECONDS = 300

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * POST /v1/user/avatar/upload-url — Session 51 (post-signin profile-setup
 * screen). Issues a short-lived presigned S3 PUT URL for a direct
 * browser-to-S3 upload; this Lambda never sees the image bytes themselves
 * (data-stack.ts's AvatarsBucket doc comment). `key` is scoped under the
 * caller's own userId so nothing here needs an ownership check the way a
 * DynamoDB write would — S3 key namespacing is the isolation boundary.
 * Issuing this URL does not attach anything to the profile — the caller
 * must still PUT the bytes, then send `key` to `PUT /v1/user/preferences`'s
 * `avatarKey` field to actually make it the account's photo.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const { contentType } = parseBody(event, AvatarUploadUrlRequestSchema)
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType]

    const key = `avatars/${userId}/${randomUUID()}.${extension}`
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_EXPIRY_SECONDS }
    )

    const response: AvatarUploadUrlResponse = { uploadUrl, key }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
