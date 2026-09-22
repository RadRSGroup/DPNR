import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  UpdateOnboardingSnapshotRequestSchema,
  type OnboardingSnapshotItem,
  type OnboardingSnapshotResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse } from '../lib/http'
import { requireConsent } from '../lib/consent'
import { getSessionCrypto } from '../lib/session-crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

/**
 * PUT /v1/user/onboarding-snapshot — First-Time Onboarding, Slice A
 * (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4). Unlike `preferences.ts`, the
 * `ONBOARDING_SNAPSHOT` item doesn't exist until the first call — this is a
 * genuine upsert (no `ConditionExpression`, `if_not_exists(createdAt, ...)`
 * for the one field that must only ever be set once), same idiom
 * `lib/credits.ts` already uses for its own first-touch item. Consent is
 * required — the caller only ever reaches `/onboarding` after `/consent` in
 * `proxy.ts`'s own gate order, and `currentIntention` is freshly-typed
 * personal content like any other (`requireConsent`, same rule
 * `create-commitment.ts` follows).
 *
 * `getSessionCrypto` is resolved lazily, not unconditionally — a real,
 * live-verification-caught finding, not a hypothetical: this session's own
 * placeholder `/onboarding` screen only ever calls this with `{ completed:
 * true }`, no `currentIntention` at all, and `getSessionCrypto` both
 * requires an active session ticket (a real `HttpError(409,
 * 'session_ticket_required')` otherwise) and makes a real KMS `Decrypt`
 * call — neither of which this call path has any reason to pay for. Only
 * resolved when a field actually needs encrypting (write) or an existing
 * `currentIntention` needs decrypting (response).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const body = parseBody(event, UpdateOnboardingSnapshotRequestSchema)
    let crypto: Awaited<ReturnType<typeof getSessionCrypto>> | undefined
    const requireCrypto = async () => (crypto ??= await getSessionCrypto(userId, 'active_session'))

    await requireConsent(ddb, TABLE_NAME, userId)

    const now = new Date().toISOString()
    const setClauses = ['updatedAt = :now', 'createdAt = if_not_exists(createdAt, :now)']
    const values: Record<string, unknown> = { ':now': now }

    if (body.currentState !== undefined) {
      setClauses.push('currentState = :currentState')
      values[':currentState'] = body.currentState
    }
    if (body.activeDomains !== undefined) {
      setClauses.push('activeDomains = :activeDomains')
      values[':activeDomains'] = body.activeDomains
    }
    if (body.desiredStates !== undefined) {
      setClauses.push('desiredStates = :desiredStates')
      values[':desiredStates'] = body.desiredStates
    }
    if (body.interactionPreference !== undefined) {
      setClauses.push('interactionPreference = :interactionPreference')
      values[':interactionPreference'] = body.interactionPreference
    }
    if (body.currentIntention !== undefined) {
      setClauses.push('currentIntention = :currentIntention')
      values[':currentIntention'] = await (await requireCrypto()).encryptField<{ text: string }>({ text: body.currentIntention })
    }
    if (body.snapshotFeedback !== undefined) {
      setClauses.push('snapshotFeedback = :snapshotFeedback')
      values[':snapshotFeedback'] = body.snapshotFeedback
    }
    if (body.completed) {
      setClauses.push('completedAt = :completedAt')
      values[':completedAt'] = now
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: Sk.onboardingSnapshot() },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      })
    )

    // Attributes not yet SET on a brand-new item are simply absent from
    // DynamoDB's response, not the schema's own `.default()` value — the
    // Zod schema's defaults only apply when parsing, and this handler reads
    // `result.Attributes` directly rather than re-validating it. Coalesce
    // by hand so a fresh, still-empty snapshot reads the same as a fully
    // parsed one.
    const item = result.Attributes as Partial<OnboardingSnapshotItem>
    const response: OnboardingSnapshotResponse = {
      currentState: item.currentState ?? null,
      activeDomains: item.activeDomains ?? [],
      desiredStates: item.desiredStates ?? [],
      interactionPreference: item.interactionPreference ?? null,
      currentIntention: item.currentIntention ? (await (await requireCrypto()).decryptField<{ text: string }>(item.currentIntention)).text : null,
      snapshotFeedback: item.snapshotFeedback ?? null,
      completedAt: item.completedAt ?? null,
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
