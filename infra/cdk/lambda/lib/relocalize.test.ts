import { describe, it, expect, beforeEach } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { EncryptedBlob, PromptVersionItem } from '@dpnr/shared-types'
import { gatherCandidates, parseTranslation, relocalizeUser, type Candidate, type RelocalizeDeps } from './relocalize'
import type { SessionCrypto } from './session-crypto'

const ddbMock = mockClient(DynamoDBDocumentClient)
const blob = (value: unknown): EncryptedBlob => ({ v: 1, iv: '', ciphertext: JSON.stringify(value) })
const crypto: SessionCrypto = {
  encryptField: async (v) => blob(v),
  decryptField: async <T,>(b: EncryptedBlob) => JSON.parse(b.ciphertext) as T,
}
const pk = 'USER#u1'
const now = new Date('2026-09-29T12:00:00.000Z')
const SIGNALS = { ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TWIN#SIGNAL#' } }

function deps(callModel: RelocalizeDeps['callModel'] = async () => ({ items: [] })): RelocalizeDeps {
  return {
    ddb: DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' })),
    tableName: 'app',
    crypto,
    translatePrompt: {} as PromptVersionItem,
    callModel,
  }
}

beforeEach(() => {
  ddbMock.reset()
  ddbMock.on(GetCommand).resolves({})
  ddbMock.on(QueryCommand).resolves({ Items: [] })
})

describe('gatherCandidates', () => {
  it('picks items not yet readable in the target language and skips the rest', async () => {
    ddbMock.on(GetCommand, { Key: { pk, sk: 'DAILYCARD#2026-09-29' } }).resolves({
      Item: { pk, sk: 'DAILYCARD#2026-09-29', content: blob({ text: 'A small question for today', kind: 'question' }), createdAt: 'c1' },
    })
    ddbMock.on(QueryCommand, SIGNALS).resolves({
      Items: [
        { pk, sk: 's1', domain: 'pattern', status: 'confirmed', updatedAt: 'u1', content: blob({ name: 'Avoidance', description: 'You may delay hard talks.' }) },
        { pk, sk: 's2', domain: 'value', status: 'confirmed', updatedAt: 'u2', content: blob({ name: 'כנות', description: 'כנות חשובה לכם.' }) },
        { pk, sk: 's3', domain: 'pattern', status: 'rejected', updatedAt: 'u3', content: blob({ name: 'Control', description: 'x' }) },
        {
          pk,
          sk: 's4',
          domain: 'trigger',
          status: 'candidate',
          updatedAt: 'u4',
          content: blob({ description: 'Being rushed' }),
          translated: { lang: 'he', content: blob({ description: 'לחץ זמן' }) },
        },
      ],
    })
    const found = await gatherCandidates(deps(), pk, 'he', now)
    expect(found.map((c) => [c.kind, c.key.sk, c.needsReferencePattern])).toEqual([
      ['daily_card', 'DAILYCARD#2026-09-29', false],
      ['insight', 's1', true],
    ])
    expect(found[0].fields).toEqual({ text: 'A small question for today' })
  })
})

describe('parseTranslation', () => {
  const batch: Candidate[] = [
    {
      id: '0',
      kind: 'insight' as const,
      key: { pk, sk: 's1' },
      stampAttr: 'updatedAt' as const,
      stampValue: 'u1',
      fields: { name: 'Avoidance', description: 'You may delay.' },
      keep: {},
      needsReferencePattern: true,
    },
    {
      id: '1',
      kind: 'daily_card' as const,
      key: { pk, sk: 'd' },
      stampAttr: 'createdAt' as const,
      stampValue: 'c',
      fields: { text: 'Hi' },
      keep: {},
      needsReferencePattern: false,
    },
  ]

  it('keeps complete items with a known reference pattern and drops partial or unknown ones', () => {
    const parsed = parseTranslation(
      {
        items: [
          {
            id: '0',
            fields: [
              { key: 'name', text: 'הימנעות' },
              { key: 'description', text: 'ייתכן שאתם דוחים.' },
            ],
            referencePattern: 'Avoidance',
          },
          { id: '1', fields: [{ key: 'other', text: 'x' }] },
          { id: '9', fields: [{ key: 'text', text: 'x' }] },
        ],
      },
      batch
    )
    expect([...parsed.keys()]).toEqual(['0'])
    expect(parsed.get('0')).toEqual({ fields: { name: 'הימנעות', description: 'ייתכן שאתם דוחים.' }, referencePattern: 'Avoidance' })
  })

  it('ignores an unknown or "none" reference pattern', () => {
    const parsed = parseTranslation(
      {
        items: [
          {
            id: '0',
            fields: [
              { key: 'name', text: 'א' },
              { key: 'description', text: 'ב' },
            ],
            referencePattern: 'none',
          },
        ],
      },
      batch
    )
    expect(parsed.get('0')?.referencePattern).toBeUndefined()
  })
})

describe('relocalizeUser', () => {
  it('writes the translation conditioned on the timestamp read, with the reference pattern', async () => {
    ddbMock.on(QueryCommand, SIGNALS).resolves({
      Items: [
        { pk, sk: 's1', domain: 'pattern', status: 'confirmed', updatedAt: 'u1', content: blob({ name: 'Avoidance', description: 'You may delay hard talks.' }) },
      ],
    })
    ddbMock.on(UpdateCommand).resolves({})
    const result = await relocalizeUser(
      deps(async () => ({
        items: [
          {
            id: '0',
            fields: [
              { key: 'name', text: 'הימנעות' },
              { key: 'description', text: 'ייתכן שאתם דוחים שיחות קשות.' },
            ],
            referencePattern: 'Avoidance',
          },
        ],
      })),
      pk,
      'he',
      'female'
    )
    expect(result).toEqual({ candidates: 1, written: 1, failedBatches: 0 })
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    expect(input.Key).toEqual({ pk, sk: 's1' })
    expect(input.ConditionExpression).toBe('attribute_exists(pk) AND #stamp = :stamp')
    expect(input.ExpressionAttributeNames).toEqual({ '#stamp': 'updatedAt' })
    expect(input.ExpressionAttributeValues?.[':stamp']).toBe('u1')
    expect(input.ExpressionAttributeValues?.[':rp']).toBe('Avoidance')
    const written = input.ExpressionAttributeValues?.[':t'] as { lang: string; content: EncryptedBlob }
    expect(written.lang).toBe('he')
    expect(JSON.parse(written.content.ciphertext)).toEqual({ name: 'הימנעות', description: 'ייתכן שאתם דוחים שיחות קשות.' })
  })

  it('counts a failed model call without throwing or writing', async () => {
    ddbMock.on(QueryCommand, SIGNALS).resolves({
      Items: [{ pk, sk: 's1', domain: 'value', status: 'confirmed', updatedAt: 'u1', content: blob({ description: 'Fairness matters to you.' }) }],
    })
    const result = await relocalizeUser(
      deps(async () => {
        throw new Error('bedrock down')
      }),
      pk,
      'he',
      'male'
    )
    expect(result).toEqual({ candidates: 1, written: 0, failedBatches: 1 })
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0)
  })
})


describe('gatherCandidates: mixed-language items', () => {
  it('sends only the fields not yet in the target language', async () => {
    ddbMock.on(QueryCommand, SIGNALS).resolves({
      Items: [
        { pk, sk: 's5', domain: 'pattern', status: 'confirmed', updatedAt: 'u5', content: blob({ name: 'Over-Accommodation', description: 'נראה שאתם מתאימים את עצמכם יותר מדי.' }) },
      ],
    })
    const found = await gatherCandidates(deps(), pk, 'he', now)
    expect(found).toHaveLength(1)
    expect(found[0].fields).toEqual({ name: 'Over-Accommodation' })
  })
})


describe('relocalizeUser: a translation that left a field in English', () => {
  it('retranslates only that field from the original and keeps the rest', async () => {
    ddbMock.on(QueryCommand, SIGNALS).resolves({
      Items: [
        {
          pk, sk: 's6', domain: 'pattern', status: 'confirmed', updatedAt: 'u6', referencePattern: 'Over-Accommodation',
          content: blob({ name: 'Over-Accommodation', description: 'You may reshape yourself.' }),
          translated: { lang: 'he', content: blob({ name: 'Over-Accommodation', description: 'ייתכן שאתם משנים את עצמכם.' }) },
        },
      ],
    })
    ddbMock.on(UpdateCommand).resolves({})
    let sent = ''
    const result = await relocalizeUser(
      deps(async (_v, vars) => {
        sent = vars.itemsJson
        return { items: [{ id: '0', fields: [{ key: 'name', text: 'הסתגלות יתר' }] }] }
      }),
      pk,
      'he',
      'male'
    )
    expect(JSON.parse(sent)[0].fields).toEqual({ name: 'Over-Accommodation' })
    expect(result.written).toBe(1)
    const input = ddbMock.commandCalls(UpdateCommand)[0].args[0].input
    const written = input.ExpressionAttributeValues?.[':t'] as { content: EncryptedBlob }
    expect(JSON.parse(written.content.ciphertext)).toEqual({ description: 'ייתכן שאתם משנים את עצמכם.', name: 'הסתגלות יתר' })
  })
})
