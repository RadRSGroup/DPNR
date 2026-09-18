import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({})
const BUCKET_NAME = process.env.AVATARS_BUCKET_NAME as string
const CHAT_BACKGROUND_URL_EXPIRY_SECONDS = 3600

/**
 * Main Chat UX Update, custom background upload (`docs/AGENT_LOG.md`) — the
 * `chatBackgroundKey` analogue of `avatar.ts`'s `getAvatarPresignedUrl`.
 * Same bucket (`AvatarsBucket`, private — every read gets a fresh presigned
 * GET rather than a stored durable URL), different key prefix
 * (`chat-backgrounds/` vs. `avatars/`). Shared by `preferences.ts` (PUT) and
 * `preferences-get.ts` (GET). `null` in, `null` out — no custom background
 * set (or `chatBackground !== 'custom'`) is not an error.
 */
export async function getChatBackgroundPresignedUrl(
  chatBackgroundKey: string | null | undefined
): Promise<string | null> {
  if (!chatBackgroundKey) return null
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET_NAME, Key: chatBackgroundKey }), {
    expiresIn: CHAT_BACKGROUND_URL_EXPIRY_SECONDS,
  })
}
