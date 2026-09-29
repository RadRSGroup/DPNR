import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { userPk } from '@dpnr/shared-types'
import { getSessionCrypto, type SessionCrypto } from '../lib/session-crypto'
import { getProfileForLanguage } from '../lib/locale'
import { resolvePromptVersion } from '../lib/prompt-registry'
import { callPromptModel } from '../lib/model-call'
import { relocalizeUser } from '../lib/relocalize'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * Relocalize worker (2026-09-29). Not behind API Gateway: invoked
 * asynchronously (InvocationType 'Event') by account/preferences.ts right
 * after `preferredLanguage` is saved, with `{ userId }` taken from that
 * request's verified JWT. The target language is re-read from the profile
 * here, never taken from the event, so the worker always converges on what
 * is actually saved (two quick switches settle on the last one).
 *
 * The person is online (they just changed a setting), so the active-session
 * ticket normally exists; the post-session ticket is the fallback the
 * scheduled composers already use.
 */
export const handler = async (event: { userId?: unknown }): Promise<void> => {
  const userId = typeof event?.userId === 'string' ? event.userId : ''
  if (!userId) {
    console.error('Relocalize: missing userId, nothing done.')
    return
  }
  const pk = userPk(userId)
  const profile = await getProfileForLanguage(ddb, TABLE_NAME, pk)

  let crypto: SessionCrypto
  try {
    crypto = await getSessionCrypto(userId, 'active_session')
  } catch {
    try {
      crypto = await getSessionCrypto(userId, 'post_session')
    } catch {
      console.error('Relocalize: no encryption ticket for this user, nothing done.')
      return
    }
  }

  const translatePrompt = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'localize', 'translate')
  const result = await relocalizeUser(
    { ddb, tableName: TABLE_NAME, crypto, translatePrompt, callModel: callPromptModel },
    pk,
    profile.preferredLanguage,
    profile.genderIdentity
  )
  console.log(`Relocalize done: ${result.candidates} to translate, ${result.written} written, ${result.failedBatches} batches failed.`)
}
