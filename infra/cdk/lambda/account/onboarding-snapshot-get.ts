import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type OnboardingSnapshotItem, type OnboardingSnapshotResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * GET /v1/user/onboarding-snapshot — the read half of the PUT above. A
 * brand-new user (or one who hasn't reached `/onboarding` yet) has no
 * `ONBOARDING_SNAPSHOT` item at all — that's a real, expected empty state,
 * not an error, so this returns the same all-null/empty shape the PUT
 * handler does for a fresh item rather than 404ing (same convention
 * `preferences-get.ts` would follow if `preferredLanguage` etc. had no
 * server-side default).
 *
 * `getSessionCrypto` is resolved lazily, only when the fetched item
 * actually has a `currentIntention` to decrypt — see `onboarding-snapshot.ts`'s
 * doc comment for why this matters (a live-verification-caught finding: an
 * unconditional call here would require an active session ticket, and make
 * a real KMS `Decrypt` call, even for a fresh item with nothing encrypted
 * to read).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)

    const result = await ddb.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { pk: userPk(userId), sk: Sk.onboardingSnapshot() } })
    )
    const item = result.Item as OnboardingSnapshotItem | undefined

    const response: OnboardingSnapshotResponse = {
      currentState: item?.currentState ?? null,
      activeDomains: item?.activeDomains ?? [],
      desiredStates: item?.desiredStates ?? [],
      interactionPreference: item?.interactionPreference ?? null,
      currentIntention: item?.currentIntention
        ? (await (await getSessionCrypto(userId)).decryptField<{ text: string }>(item.currentIntention)).text
        : null,
      snapshotFeedback: item?.snapshotFeedback ?? null,
      completedAt: item?.completedAt ?? null,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
