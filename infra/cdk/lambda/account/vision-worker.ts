import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { Jimp } from 'jimp'
import { Sk, userPk } from '@dpnr/shared-types'
import { refundVisionGeneration } from '../lib/vision-quota'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const s3 = new S3Client({})
const bedrock = new BedrockRuntimeClient({})
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const BUCKET_NAME = process.env.AVATARS_BUCKET_NAME as string

// Cross-region inference profiles — Stability's image models reject
// on-demand invocation by bare model id, same quirk as the Claude models.
const REMOVE_BACKGROUND_MODEL = 'us.stability.stable-image-remove-background-v1:0'
const INPAINT_MODEL = 'us.stability.stable-image-inpaint-v1:0'

// Wide canvas for a chat background (~16:9, within the inpaint model's
// pixel limit). The person is bottom-centred at 80% of the height so both
// the desktop layout and mobile's centre crop keep them in frame.
const CANVAS_WIDTH = 1792
const CANVAS_HEIGHT = 1024
const PERSON_HEIGHT_RATIO = 0.8

/**
 * Found in live testing (Session 67): left to its own devices the model
 * invented a second figure hanging from a wooden post in one scene — not
 * acceptable in a psychological-support product. Everything here steers
 * away from extra people and from anything violent or distressing.
 */
const NEGATIVE_PROMPT =
  'additional people, second person, crowd, figures, silhouettes, hanging, rope, noose, blood, injury, violence, ' +
  'weapons, gore, nudity, text, letters, watermark, logo, distorted face, extra limbs, deformed'

export interface VisionWorkerPayload {
  userId: string
  jobId: string
  prompt: string
  avatarKey: string
  quotaMonth: string
}

class ContentFilteredError extends Error {}

/**
 * Async worker for POST /v1/user/chat-background/vision (vision-start.ts
 * invokes it with InvocationType 'Event'; not routed through API Gateway).
 *
 * Pipeline, chosen after live testing three alternatives (Session 67):
 *   1. Stability remove-background — an exact cut-out of the person from
 *      their own profile photo;
 *   2. place the cut-out on a transparent wide canvas (jimp — pure JS, so
 *      nothing native to bundle for Lambda);
 *   3. Stability inpaint with no explicit mask — the model derives the mask
 *      from the alpha channel, so it paints the described scene into every
 *      transparent pixel and leaves the person's own pixels untouched.
 * ("search & replace the background" kept the original room; "inpaint then
 * outpaint" took ~40s and produced the hanging-figure artifact above.)
 *
 * Success → the image is stored under the caller's own
 * `chat-backgrounds/<userId>/` prefix and made their chat background.
 * Any failure → job marked failed and the month's generation refunded.
 * Never logs the prompt or any image content.
 */
export async function handler(payload: VisionWorkerPayload): Promise<void> {
  const { userId, jobId, prompt, avatarKey, quotaMonth } = payload
  const pk = userPk(userId)

  try {
    if (!avatarKey.startsWith(`avatars/${userId}/`)) throw new Error('avatar key outside caller prefix')

    const avatar = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: avatarKey }))
    const avatarBytes = Buffer.from(await avatar.Body!.transformToByteArray())

    // Normalize (EXIF-free, bounded size) before sending it anywhere.
    const source = await Jimp.read(avatarBytes)
    source.scaleToFit({ w: 1024, h: 1024 })
    const sourcePng = await source.getBuffer('image/png')

    const cutout = await invokeStability(REMOVE_BACKGROUND_MODEL, { image: sourcePng.toString('base64'), output_format: 'png' })

    const person = await Jimp.read(cutout)
    const scale = (CANVAS_HEIGHT * PERSON_HEIGHT_RATIO) / person.bitmap.height
    person.resize({ w: Math.round(person.bitmap.width * scale), h: Math.round(person.bitmap.height * scale) })
    const canvas = new Jimp({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, color: 0x00000000 })
    canvas.composite(person, Math.round((CANVAS_WIDTH - person.bitmap.width) / 2), CANVAS_HEIGHT - person.bitmap.height)
    const canvasPng = await canvas.getBuffer('image/png')

    const scene = await invokeStability(INPAINT_MODEL, {
      image: canvasPng.toString('base64'),
      prompt: `${prompt}. Photorealistic, cinematic, natural lighting, the person is standing in this place.`,
      negative_prompt: NEGATIVE_PROMPT,
      output_format: 'jpeg',
    })

    const resultKey = `chat-backgrounds/${userId}/vision-${jobId}.jpg`
    await s3.send(new PutObjectCommand({ Bucket: BUCKET_NAME, Key: resultKey, Body: scene, ContentType: 'image/jpeg' }))

    const now = new Date().toISOString()
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: Sk.profile() },
        ConditionExpression: 'attribute_exists(pk)',
        UpdateExpression: 'SET chatBackground = :custom, chatBackgroundKey = :key, updatedAt = :now',
        ExpressionAttributeValues: { ':custom': 'custom', ':key': resultKey, ':now': now },
      })
    )
    await setJobStatus(pk, jobId, { status: 'done', resultKey })
  } catch (err) {
    const errorCode = err instanceof ContentFilteredError ? 'content_filtered' : 'generation_failed'
    console.error('[vision-worker] generation failed', { jobId, errorCode, reason: err instanceof Error ? err.name : 'unknown' })
    await refundVisionGeneration(ddb, TABLE_NAME, pk, quotaMonth).catch(() => undefined)
    await setJobStatus(pk, jobId, { status: 'failed', errorCode }).catch(() => undefined)
  }
}

async function invokeStability(modelId: string, body: Record<string, unknown>): Promise<Buffer> {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    })
  )
  const parsed = JSON.parse(new TextDecoder().decode(response.body)) as {
    images?: string[]
    finish_reasons?: (string | null)[]
  }
  // A non-null finish reason is Stability's content-filter signal.
  if (parsed.finish_reasons?.some((r) => r !== null && r !== undefined)) throw new ContentFilteredError()
  const image = parsed.images?.[0]
  if (!image) throw new Error('no image returned')
  return Buffer.from(image, 'base64')
}

async function setJobStatus(
  pk: string,
  jobId: string,
  update: { status: 'done'; resultKey: string } | { status: 'failed'; errorCode: string }
): Promise<void> {
  const names: Record<string, string> = { '#status': 'status' }
  const values: Record<string, unknown> = { ':status': update.status, ':now': new Date().toISOString() }
  let expression = 'SET #status = :status, updatedAt = :now'
  if (update.status === 'done') {
    expression += ', resultKey = :resultKey'
    values[':resultKey'] = update.resultKey
  } else {
    expression += ', errorCode = :errorCode'
    values[':errorCode'] = update.errorCode
  }
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: Sk.visionJob(jobId) },
      UpdateExpression: expression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  )
}
