import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({})
const BUCKET_NAME = process.env.AVATARS_BUCKET_NAME as string
const AVATAR_URL_EXPIRY_SECONDS = 3600

/**
 * Session 51 — `data-stack.ts`'s AvatarsBucket is private, so every read
 * generates a fresh presigned GET rather than storing a durable public URL
 * anywhere. Shared by `preferences.ts` (PUT) and `preferences-get.ts` (GET)
 * since both return the same `PreferencesResponse` shape. `null` in,
 * `null` out — no photo set is not an error.
 */
export async function getAvatarPresignedUrl(avatarKey: string | null | undefined): Promise<string | null> {
  if (!avatarKey) return null
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: avatarKey }), {
    expiresIn: AVATAR_URL_EXPIRY_SECONDS,
  })
}
