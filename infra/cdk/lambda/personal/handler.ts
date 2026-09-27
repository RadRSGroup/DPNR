import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  CreateRitualRequestSchema,
  UpdateRitualRequestSchema,
  CreateJournalEntryRequestSchema,
  UpdateJournalEntryRequestSchema,
  RITUALS_MAX,
  JOURNAL_PAGE_SIZE,
  type RitualItem,
  type RitualView,
  type RitualsListResponse,
  type JournalEntryItem,
  type JournalEntryView,
  type JournalListResponse,
} from '@dpnr/shared-types'
import { requireUserId, parseBody, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { requireConsent } from '../lib/consent'
import { getSessionCrypto, type SessionCrypto } from '../lib/session-crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

type RitualContent = { text: string }
type JournalContent = { title?: string; body: string }

/**
 * My Profile personal space (Session 74, Wave 2 Slice 5): the person's own
 * rituals and private journal. One Lambda for all eight routes (dispatched
 * on `routeKey`) because Dpnr-Api is close to CloudFormation's 500-resource
 * limit; a function per route would add ~50 resources.
 *
 * Ownership is structural: every key is built from the JWT's own user id,
 * and ids from the path only ever select a sort key inside that partition.
 * Writes require consent (freshly typed personal content, same rule as
 * commitments); reads and deletes don't (your own data back to you, and
 * deleting must never be blocked). Nothing here is read by any AI, the
 * Digital Twin, signals or scoring.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    switch (event.routeKey) {
      case 'GET /v1/rituals':
        return jsonResponse(200, await listRituals(pk, await getSessionCrypto(userId, 'active_session')))
      case 'POST /v1/rituals': {
        const body = parseBody(event, CreateRitualRequestSchema)
        await requireConsent(ddb, TABLE_NAME, userId)
        return jsonResponse(201, await createRitual(pk, body.timeOfDay, body.text, await getSessionCrypto(userId, 'active_session')))
      }
      case 'PUT /v1/rituals/{id}': {
        const body = parseBody(event, UpdateRitualRequestSchema)
        await requireConsent(ddb, TABLE_NAME, userId)
        return jsonResponse(200, await updateRitual(pk, pathId(event), body, await getSessionCrypto(userId, 'active_session')))
      }
      case 'DELETE /v1/rituals/{id}':
        await deleteOwned(pk, Sk.ritual(pathId(event)), 'ritual_not_found')
        return jsonResponse(200, { ok: true })
      case 'GET /v1/journal':
        return jsonResponse(200, await listJournal(pk, event.queryStringParameters?.cursor, await getSessionCrypto(userId, 'active_session')))
      case 'POST /v1/journal': {
        const body = parseBody(event, CreateJournalEntryRequestSchema)
        await requireConsent(ddb, TABLE_NAME, userId)
        return jsonResponse(201, await putJournal(pk, newEntryId(), body, await getSessionCrypto(userId, 'active_session'), null))
      }
      case 'PUT /v1/journal/{id}': {
        const body = parseBody(event, UpdateJournalEntryRequestSchema)
        await requireConsent(ddb, TABLE_NAME, userId)
        const entryId = pathId(event)
        const existing = await getOwned<JournalEntryItem>(pk, Sk.journalEntry(entryId), 'journal_entry_not_found')
        return jsonResponse(200, await putJournal(pk, entryId, body, await getSessionCrypto(userId, 'active_session'), existing))
      }
      case 'DELETE /v1/journal/{id}':
        await deleteOwned(pk, Sk.journalEntry(pathId(event)), 'journal_entry_not_found')
        return jsonResponse(200, { ok: true })
      default:
        throw new HttpError(404, 'not_found', 'Unknown route.')
    }
  } catch (err) {
    return errorResponse(err)
  }
}

const ID_PATTERN = /^[0-9a-f-]{8,64}$/

function pathId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const id = event.pathParameters?.id
  if (!id || !ID_PATTERN.test(id)) throw new HttpError(400, 'invalid_id', 'Invalid id.')
  return id
}

/** Sorts by creation time as a string: zero-padded epoch ms + a random suffix. */
export function newEntryId(now = Date.now()): string {
  return `${String(now).padStart(15, '0')}-${randomUUID().slice(0, 8)}`
}

async function getOwned<T>(pk: string, sk: string, notFoundCode: string): Promise<T> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk } }))
  if (!result.Item) throw new HttpError(404, notFoundCode, 'Not found.')
  return result.Item as T
}

async function deleteOwned(pk: string, sk: string, notFoundCode: string): Promise<void> {
  await ddb
    .send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk }, ConditionExpression: 'attribute_exists(pk)' }))
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === 'ConditionalCheckFailedException') throw new HttpError(404, notFoundCode, 'Not found.')
      throw err
    })
}

async function ritualView(item: RitualItem, crypto: SessionCrypto): Promise<RitualView> {
  const { text } = await crypto.decryptField<RitualContent>(item.content)
  return { ritualId: item.ritualId, timeOfDay: item.timeOfDay, text, createdAt: item.createdAt, updatedAt: item.updatedAt }
}

async function queryAll<T>(pk: string, prefix: string): Promise<T[]> {
  const items: T[] = []
  let start: Record<string, unknown> | undefined
  do {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': prefix },
      ExclusiveStartKey: start,
    }))
    items.push(...((result.Items ?? []) as T[]))
    start = result.LastEvaluatedKey
  } while (start)
  return items
}

async function listRituals(pk: string, crypto: SessionCrypto): Promise<RitualsListResponse> {
  const items = await queryAll<RitualItem>(pk, 'RITUAL#')
  const rituals = await Promise.all(items.map((item) => ritualView(item, crypto)))
  rituals.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return { rituals }
}

async function createRitual(pk: string, timeOfDay: RitualItem['timeOfDay'], text: string, crypto: SessionCrypto): Promise<RitualView> {
  const existing = await queryAll<RitualItem>(pk, 'RITUAL#')
  if (existing.length >= RITUALS_MAX) {
    throw new HttpError(409, 'rituals_limit', `You can keep up to ${RITUALS_MAX} rituals.`)
  }
  const ritualId = randomUUID()
  const now = new Date().toISOString()
  const item: RitualItem = {
    pk,
    sk: Sk.ritual(ritualId),
    ritualId,
    timeOfDay,
    content: await crypto.encryptField<RitualContent>({ text }),
    createdAt: now,
    updatedAt: now,
  }
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return { ritualId, timeOfDay, text, createdAt: now, updatedAt: now }
}

async function updateRitual(
  pk: string,
  ritualId: string,
  patch: { timeOfDay?: RitualItem['timeOfDay']; text?: string },
  crypto: SessionCrypto
): Promise<RitualView> {
  const existing = await getOwned<RitualItem>(pk, Sk.ritual(ritualId), 'ritual_not_found')
  const text = patch.text ?? (await crypto.decryptField<RitualContent>(existing.content)).text
  const item: RitualItem = {
    ...existing,
    timeOfDay: patch.timeOfDay ?? existing.timeOfDay,
    content: await crypto.encryptField<RitualContent>({ text }),
    updatedAt: new Date().toISOString(),
  }
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return ritualView(item, crypto)
}

function encodeCursor(sk: string): string {
  return Buffer.from(sk, 'utf-8').toString('base64url')
}

/** Only ever a JOURNAL# sort key; the partition always comes from the JWT, so a cursor can't reach anyone else's data. */
function decodeCursor(cursor: string | undefined): string | undefined {
  if (!cursor) return undefined
  const sk = Buffer.from(cursor, 'base64url').toString('utf-8')
  if (!/^JOURNAL#[0-9a-f-]{8,64}$/.test(sk)) throw new HttpError(400, 'invalid_cursor', 'Invalid cursor.')
  return sk
}

async function journalView(item: JournalEntryItem, crypto: SessionCrypto): Promise<JournalEntryView> {
  const { title, body } = await crypto.decryptField<JournalContent>(item.content)
  return { entryId: item.entryId, ...(title ? { title } : {}), body, createdAt: item.createdAt, updatedAt: item.updatedAt }
}

async function listJournal(pk: string, cursor: string | undefined, crypto: SessionCrypto): Promise<JournalListResponse> {
  const startSk = decodeCursor(cursor)
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': 'JOURNAL#' },
    ScanIndexForward: false,
    Limit: JOURNAL_PAGE_SIZE,
    ...(startSk ? { ExclusiveStartKey: { pk, sk: startSk } } : {}),
  }))
  const items = (result.Items ?? []) as JournalEntryItem[]
  const entries = await Promise.all(items.map((item) => journalView(item, crypto)))
  const lastSk = result.LastEvaluatedKey?.sk
  return { entries, ...(typeof lastSk === 'string' ? { nextCursor: encodeCursor(lastSk) } : {}) }
}

async function putJournal(
  pk: string,
  entryId: string,
  body: { title?: string; body: string },
  crypto: SessionCrypto,
  existing: JournalEntryItem | null
): Promise<JournalEntryView> {
  const now = new Date().toISOString()
  const content: JournalContent = { ...(body.title ? { title: body.title } : {}), body: body.body }
  const item: JournalEntryItem = {
    pk,
    sk: Sk.journalEntry(entryId),
    entryId,
    content: await crypto.encryptField<JournalContent>(content),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
  return { entryId, ...content, createdAt: item.createdAt, updatedAt: now }
}
