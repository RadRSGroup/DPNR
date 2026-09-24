import { randomUUID } from 'node:crypto'
import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import {
  Sk,
  userPk,
  VisionStartRequestSchema,
  type UserProfileItem,
  type VisionJobItem,
  type VisionStartResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { classifySafety } from '../lib/safety'
import { reserveVisionGeneration, refundVisionGeneration } from '../lib/vision-quota'
import type { VisionWorkerPayload } from './vision-worker'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const lambdaClient = new LambdaClient({})
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string
const VISION_WORKER_FUNCTION_NAME = process.env.VISION_WORKER_FUNCTION_NAME as string

const JOB_TTL_SECONDS = 7 * 24 * 60 * 60

/**
 * POST /v1/user/chat-background/vision — starts a "Vision": a chat
 * background that places the caller's own profile photo inside a scene they
 * describe (Session 67, the user's product decision — replaces the two
 * generic preset backgrounds).
 *
 * Order matters and is cheapest-check-first:
 *   1. a profile photo must exist (409 `avatar_required`);
 *   2. the scene text goes through the same safety classifier Companion
 *      uses — a non-`normal` state refuses the generation (422
 *      `vision_declined`) rather than painting it; the classification is
 *      persisted as a SafetyEvent exactly like a chat turn would be;
 *   3. one of the month's free generations is reserved atomically (429
 *      `vision_limit_reached` when used up);
 *   4. a job item is written and the worker is invoked asynchronously —
 *      the image pipeline takes ~20-40s, past API Gateway's 30s limit.
 *
 * The scene text is passed to the worker in the invocation payload only —
 * never written to DynamoDB and never logged.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const { prompt } = parseBody(event, VisionStartRequestSchema)

    const profileResult = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.profile() } }))
    const profile = profileResult.Item as UserProfileItem | undefined
    if (!profile) throw new HttpError(404, 'profile_not_found', 'User profile does not exist.')
    if (!profile.avatarKey) {
      throw new HttpError(409, 'avatar_required', 'Add a profile photo first — your Vision is built around it.')
    }

    const jobId = randomUUID()
    const safety = await classifySafety(
      ddb,
      TABLE_NAME,
      PROMPT_REGISTRY_TABLE_NAME,
      pk,
      'chat_background_vision',
      `vision-${jobId}`,
      prompt,
      '(no prior messages)'
    )
    if (safety.safetyState !== 'normal') {
      throw new HttpError(422, 'vision_declined', "Let's not turn that into an image.")
    }

    const { month, remaining } = await reserveVisionGeneration(ddb, TABLE_NAME, pk)

    const now = new Date()
    const job: VisionJobItem = {
      pk,
      sk: Sk.visionJob(jobId),
      jobId,
      status: 'pending',
      quotaMonth: month,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ttl: Math.floor(now.getTime() / 1000) + JOB_TTL_SECONDS,
    }

    try {
      await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: job }))
      const payload: VisionWorkerPayload = { userId, jobId, prompt, avatarKey: profile.avatarKey, quotaMonth: month }
      await lambdaClient.send(
        new InvokeCommand({
          FunctionName: VISION_WORKER_FUNCTION_NAME,
          InvocationType: 'Event',
          Payload: Buffer.from(JSON.stringify(payload)),
        })
      )
    } catch (err) {
      // Nothing was generated — give the reserved generation back.
      await refundVisionGeneration(ddb, TABLE_NAME, pk, month)
      throw err
    }

    const body: VisionStartResponse = { jobId, remainingThisMonth: remaining }
    return jsonResponse(202, body)
  } catch (err) {
    return errorResponse(err)
  }
}
