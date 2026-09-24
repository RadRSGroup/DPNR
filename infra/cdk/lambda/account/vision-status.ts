import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type VisionJobItem, type VisionStatusResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getChatBackgroundPresignedUrl } from '../lib/chat-background'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/user/chat-background/vision/{jobId} — polled by the Vision UI
 * until the async worker finishes. Ownership is structural: the job key is
 * built from the caller's own JWT `sub`, so another user's job id is
 * simply a 404.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const jobId = event.pathParameters?.jobId
    if (!jobId) throw new HttpError(400, 'validation_error', 'Missing job id.')

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.visionJob(jobId) } })
    )
    const job = result.Item as VisionJobItem | undefined
    if (!job) throw new HttpError(404, 'vision_job_not_found', 'No such Vision.')

    const body: VisionStatusResponse = {
      status: job.status,
      errorCode: job.errorCode ?? null,
      imageUrl: job.status === 'done' ? await getChatBackgroundPresignedUrl(job.resultKey) : null,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
