import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk } from '@dpnr/shared-types'
import type { SessionCrypto } from '../../lib/session-crypto'
import type { StepContext } from '../types'

/**
 * Slice 5b (Session 75): Decision Room BODY_EMOTION captures emotions + body
 * placements like the Mirror Room. Backward compatibility is the point of most
 * of these: the pre-5b client payload, pre-5b stored items, and the legacy
 * single values every older reader depends on.
 */

const modelVars: Record<string, string>[] = []
vi.mock('../../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ sk: 'VERSION#0001' })),
  promptRef: vi.fn(() => 'decision_room/emotion_reflection@v1'),
}))
vi.mock('../../lib/model-call', () => ({
  callPromptModel: vi.fn(async (_v: unknown, vars: Record<string, string>) => {
    modelVars.push(vars)
    return 'A generated reflection.'
  }),
}))

import { bodyEmotionStep, legacyValues, type DecisionEmotionContent } from './body-emotion'
import { gatherDecisionContext } from './decision-context'

const ddbMock = mockClient(DynamoDBDocumentClient)
const PK = 'USER#u1'
const SID = 'd1'
const crypto = {
  encryptField: async (value: unknown) => ({ __enc: value }),
  decryptField: async (blob: { __enc: unknown }) => blob.__enc,
} as unknown as SessionCrypto

const FEAR = { label: 'Fear', color: '#7c3aed' }
const HOPE = { label: 'Hope', color: '#22c55e' }

let items: Map<string, Record<string, unknown>>
function ctx(action: StepContext['action'], input: Record<string, unknown>): StepContext {
  return { pk: PK, sessionId: SID, action, input, crypto, languageInstruction: 'Reply in English.' }
}
function storedEmotion(): DecisionEmotionContent {
  return (items.get(Sk.decisionEmotion(SID))?.content as { __enc: DecisionEmotionContent }).__enc
}
async function status(p: Promise<unknown>): Promise<{ statusCode?: number; code?: string }> {
  try {
    await p
    return {}
  } catch (e) {
    return e as { statusCode?: number; code?: string }
  }
}

beforeEach(() => {
  ddbMock.reset()
  modelVars.length = 0
  items = new Map()
  items.set(Sk.decisionRoom(SID), {
    pk: PK,
    sk: Sk.decisionRoom(SID),
    content: { __enc: { title: 'Take the new job?', subtitle: null, narrative: 'I keep going back and forth.' } },
  })
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) => ({ Item: items.get(input.Key.sk) }))
  ddbMock.on(PutCommand).callsFake((input: { Item: Record<string, unknown> }) => {
    items.set(input.Item.sk as string, input.Item)
    return {}
  })
  ddbMock.on(QueryCommand).resolves({ Items: [] })
})

describe('BODY_EMOTION REFINE', () => {
  it('formats chips + placements + own words into the same two template variables', async () => {
    await bodyEmotionStep.handle(
      ctx('REFINE', {
        emotionsFelt: [FEAR, HOPE],
        bodyPlacements: [
          { area: 'Chest', emotion: 'Fear' },
          { area: 'Throat', emotion: 'Fear' },
          { area: 'Legs', emotion: 'Joy' }, // not a chosen emotion — dropped
        ],
        emotion: 'mostly tight',
      })
    )
    expect(modelVars[0].emotion).toBe('chose Fear, Hope; in their words: "mostly tight"')
    expect(modelVars[0].bodyLocation).toBe('placed on the body map: Fear in Chest, Throat')
    expect(Object.keys(modelVars[0]).sort()).toEqual(['bodyLocation', 'emotion', 'languageInstruction', 'narrativeExcerpt', 'title'])
  })

  it('still accepts the pre-5b payload and passes it through unchanged', async () => {
    await bodyEmotionStep.handle(ctx('REFINE', { bodyLocation: 'Chest', emotion: 'Fear' }))
    expect(modelVars[0].bodyLocation).toBe('Chest')
    expect(modelVars[0].emotion).toBe('Fear')
  })

  it('rejects a capture with no emotion or no body', async () => {
    expect((await status(bodyEmotionStep.handle(ctx('REFINE', { bodyPlacements: [] })))).code).toBe('emotion_required')
    expect((await status(bodyEmotionStep.handle(ctx('REFINE', { emotionsFelt: [FEAR] })))).code).toBe('body_required')
    expect((await status(bodyEmotionStep.handle(ctx('REFINE', { bodyLocation: 'Chest' })))).code).toBe('emotion_required')
  })
})

describe('BODY_EMOTION SUBMIT', () => {
  const base = { aiReflection: 'A generated reflection.', response: 'accurate' }

  it('stores the structured capture plus the legacy single values', async () => {
    const res = await bodyEmotionStep.handle(
      ctx('SUBMIT_STEP', {
        ...base,
        emotionsFelt: [FEAR, HOPE],
        bodyPlacements: [{ area: 'Chest', emotion: 'Fear' }, { area: 'Chest', emotion: 'Fear' }, { area: 'Hands', emotion: 'Hope' }],
        bodyResponse: ' a knot ',
      })
    )
    expect(res.nextStepId).toBe('CHOOSE_LENS')
    expect(storedEmotion()).toEqual({
      bodyLocation: 'Chest',
      emotionColor: 'Fear',
      aiReflection: 'A generated reflection.',
      userResponse: 'accurate',
      emotionsFelt: [FEAR, HOPE],
      bodyPlacements: [{ area: 'Chest', emotion: 'Fear' }, { area: 'Hands', emotion: 'Hope' }],
      emotionWords: undefined,
      bodyWords: 'a knot',
    })
  })

  it('still accepts the pre-5b payload and stores the same shape as before', async () => {
    await bodyEmotionStep.handle(ctx('SUBMIT_STEP', { ...base, bodyLocation: 'Gut', emotionColor: 'Anxiety' }))
    const stored = storedEmotion()
    expect(stored.bodyLocation).toBe('Gut')
    expect(stored.emotionColor).toBe('Anxiety')
    expect(stored.emotionsFelt).toBeUndefined()
    expect(stored.bodyPlacements).toBeUndefined()
  })

  it('keeps the refine gate', async () => {
    const res = await status(
      bodyEmotionStep.handle(ctx('SUBMIT_STEP', { ...base, response: 'refine', emotionsFelt: [FEAR], bodyResponse: 'chest' }))
    )
    expect(res.code).toBe('refinement_required')
  })

  it('rejects a bad colour', async () => {
    const res = await status(
      bodyEmotionStep.handle(ctx('SUBMIT_STEP', { ...base, emotionsFelt: [{ label: 'Fear', color: 'red' }], bodyResponse: 'x' }))
    )
    expect(res.statusCode).toBe(400)
  })
})

describe('legacy values + summary context', () => {
  it('falls back to own words when chips/map were not used', () => {
    expect(legacyValues({ emotion: 'uneasy', bodyResponse: 'my jaw' })).toEqual({ bodyLocation: 'my jaw', emotionColor: 'uneasy' })
  })

  function seedOptionsAnd(emotion: DecisionEmotionContent) {
    for (const label of ['A', 'B'] as const) {
      items.set(Sk.decisionOption(SID, label), { content: { __enc: { content: `Option ${label}` } } })
    }
    items.set(Sk.decisionEmotion(SID), { content: { __enc: emotion } })
  }

  it('reads a pre-5b emotion item exactly as before', async () => {
    seedOptionsAnd({ bodyLocation: 'Chest', emotionColor: 'Fear', aiReflection: 'r', userResponse: 'accurate' })
    const c = await gatherDecisionContext(crypto, PK, SID)
    expect([c.emotionColor, c.emotionBodyLocation, c.emotionReflection]).toEqual(['Fear', 'Chest', 'r'])
  })

  it('gives the summary prompts every emotion and placement when the map was used', async () => {
    seedOptionsAnd({
      bodyLocation: 'Chest', emotionColor: 'Fear', aiReflection: 'r', userResponse: 'accurate',
      emotionsFelt: [FEAR, HOPE], bodyPlacements: [{ area: 'Chest', emotion: 'Fear' }, { area: 'Hands', emotion: 'Hope' }],
    })
    const c = await gatherDecisionContext(crypto, PK, SID)
    expect(c.emotionColor).toBe('chose Fear, Hope')
    expect(c.emotionBodyLocation).toBe('placed on the body map: Fear in Chest; Hope in Hands')
  })
})
