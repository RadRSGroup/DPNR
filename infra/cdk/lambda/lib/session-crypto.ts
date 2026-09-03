import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms'
import { GlobalKeys, ENCRYPTED_BLOB_VERSION, type SessionTicketItem, type EncryptedBlob } from '@dpnr/shared-types'
import { HttpError } from './http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const kms = new KMSClient({})
const SESSION_TICKETS_TABLE_NAME = process.env.SESSION_TICKETS_TABLE_NAME as string
const SESSION_TICKET_KMS_KEY_ID = process.env.SESSION_TICKET_KMS_KEY_ID as string

const AES_ALGORITHM = 'aes-256-gcm'
const GCM_IV_LENGTH_BYTES = 12
const GCM_TAG_LENGTH_BYTES = 16

export interface SessionCrypto {
  encryptField<T>(value: T): Promise<EncryptedBlob>
  decryptField<T>(blob: EncryptedBlob): Promise<T>
}

/**
 * Phase 6 Stage 4 (ADR 0009/0013) — resolves the caller's live DEK from
 * their active session ticket and returns real AES-256-GCM encrypt/decrypt
 * bound to it. This is the first real caller of the `kms:Decrypt` grant
 * Stage 2 put on 12 Lambdas — nothing called it before this.
 *
 * Deliberately re-resolves the DEK on every call, never cached at module
 * scope: a warm Lambda execution environment can be reused for a different
 * user's request on a later invocation, and caching a decrypted DEK there
 * would risk leaking one user's key into another's request.
 */
export async function getSessionCrypto(userId: string): Promise<SessionCrypto> {
  const ticket = await findActiveSessionTicket(userId)
  const dek = await unwrapDek(ticket.kmsWrappedDek)

  return {
    async encryptField<T>(value: T): Promise<EncryptedBlob> {
      return encryptWithDek(dek, value)
    },
    async decryptField<T>(blob: EncryptedBlob): Promise<T> {
      return decryptWithDek(dek, blob)
    },
  }
}

async function findActiveSessionTicket(userId: string): Promise<SessionTicketItem> {
  const now = new Date().toISOString()
  const result = await ddb.send(
    new QueryCommand({
      TableName: SESSION_TICKETS_TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      FilterExpression: '#purpose = :purpose AND expiresAt > :now',
      ExpressionAttributeNames: { '#purpose': 'purpose' },
      ExpressionAttributeValues: { ':pk': GlobalKeys.sessionTicketPk(userId), ':purpose': 'active_session', ':now': now },
    })
  )
  const items = (result.Items ?? []) as SessionTicketItem[]
  if (items.length === 0) {
    throw new HttpError(409, 'session_ticket_required', 'No active encryption session — please sign in again to continue.')
  }
  // Usually exactly one; a multi-tab/multi-login user could have more than
  // one live ticket, so take the most recently created.
  return items.reduce((latest, item) => (item.createdAt > latest.createdAt ? item : latest))
}

async function unwrapDek(kmsWrappedDek: string): Promise<Buffer> {
  const result = await kms.send(
    new DecryptCommand({
      KeyId: SESSION_TICKET_KMS_KEY_ID,
      CiphertextBlob: Buffer.from(kmsWrappedDek, 'base64'),
      EncryptionAlgorithm: 'RSAES_OAEP_SHA_256',
    })
  )
  if (!result.Plaintext) {
    throw new Error('KMS Decrypt returned no Plaintext bytes.')
  }
  return Buffer.from(result.Plaintext)
}

/**
 * WebCrypto's AES-GCM appends the auth tag to the ciphertext it returns —
 * Node's `crypto` module returns it separately via `cipher.getAuthTag()`.
 * Concatenating it onto `ciphertext` here (and splitting it back off in
 * `decryptWithDek`) keeps this wire-compatible with the client-side crypto
 * module (`apps/web/src/lib/crypto/blob.ts`), even though nothing
 * cross-decrypts between the two today.
 */
function encryptWithDek<T>(dek: Buffer, value: T): EncryptedBlob {
  const iv = randomBytes(GCM_IV_LENGTH_BYTES)
  const cipher = createCipheriv(AES_ALGORITHM, dek, iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf-8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
  return { v: ENCRYPTED_BLOB_VERSION, iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') }
}

function decryptWithDek<T>(dek: Buffer, blob: EncryptedBlob): T {
  const iv = Buffer.from(blob.iv, 'base64')
  const combined = Buffer.from(blob.ciphertext, 'base64')
  const tag = combined.subarray(combined.length - GCM_TAG_LENGTH_BYTES)
  const ciphertext = combined.subarray(0, combined.length - GCM_TAG_LENGTH_BYTES)
  const decipher = createDecipheriv(AES_ALGORITHM, dek, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf-8')) as T
}
