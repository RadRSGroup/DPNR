import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk } from '@dpnr/shared-types'
import type { SessionCrypto } from '../../lib/session-crypto'
import type { StepContext } from '../types'

/**
 * All three lenses, any order (founder feedback 2026-09-28 #6/#7): each
 * lens's summary returns to CHOOSE_LENS and records the lens, `continue`
 * goes on to Future Projection, and one lens never erases another's tags.
 */

vi.mock('../../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ sk: 'VERSION#0001' })),
  promptRef: vi.fn(() => 'decision_room/x@v1'),
}))
vi.mock('../../lib/model-call', () => ({ callPromptModel: vi.fn(async () => ({ wordFromUs: 'w', reflection: 'r' })) }))

import { chooseLensStep, stepForLens } from './choose-lens'
import { deepExplorationStep } from './deep-exploration'
import { deepExplorationSummaryStep, valuesNeedsSummaryStep, addLens } from './section-summary'

const ddbMock = mockClient(DynamoDBDocumentClient)
const PK = 'USER#u1'
const SID = 'd1'
const crypto = {
  encryptField: async (value: unknown) => ({ __enc: value }),
  decryptField: async (blob: { __enc: unknown }) => blob.__enc,
} as unknown as SessionCrypto

let items: Map<string, Record<string, unknown>>
const ctx = (input: Record<string, unknown>, action: StepContext['action'] = 'SUBMIT_STEP'): StepContext => ({
  pk: PK,
  sessionId: SID,
  action,
  input,
  crypto,
  languageInstruction: 'Reply in English.',
})
const decision = () => items.get(Sk.decisionRoom(SID)) as Record<string, unknown>
const tagTypes = () =>
  [...items.values()].filter((i) => String(i.sk).includes('#TAG#')).map((i) => `${i.optionLabel}:${i.tagType}`).sort()
const tag = (label: string) => [{ label, aiSuggested: false }]

beforeEach(() => {
  ddbMock.reset()
  items = new Map()
  items.set(Sk.decisionRoom(SID), {
    pk: PK,
    sk: Sk.decisionRoom(SID),
    decisionId: SID,
    status: 'active',
    currentStep: 4,
    lens: null,
    reviewDate: null,
    content: { __enc: { title: 'Take the job?', subtitle: null, narrative: 'Back and forth.' } },
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
  })
  ddbMock.on(GetCommand).callsFake((input: { Key: { sk: string } }) => ({ Item: items.get(input.Key.sk) }))
  ddbMock.on(PutCommand).callsFake((input: { Item: Record<string, unknown> }) => {
    items.set(input.Item.sk as string, input.Item)
    return {}
  })
  ddbMock.on(DeleteCommand).callsFake((input: { Key: { sk: string } }) => {
    items.delete(input.Key.sk)
    return {}
  })
  ddbMock.on(QueryCommand).callsFake((input: { ExpressionAttributeValues: Record<string, string> }) => ({
    Items: [...items.values()].filter((i) => String(i.sk).startsWith(input.ExpressionAttributeValues[':prefix'] ?? '\u0000')),
  }))
})

describe('CHOOSE_LENS', () => {
  it('routes each lens to its own exploration step', async () => {
    expect(stepForLens('pros_cons')).toBe('DEEP_EXPLORATION')
    expect(stepForLens('fears_desires')).toBe('DEEP_EXPLORATION')
    expect(stepForLens('values_needs')).toBe('VALUES_NEEDS')
    const r = await chooseLensStep.handle(ctx({ lens: 'values_needs' }))
    expect(r.nextStepId).toBe('VALUES_NEEDS')
    expect(decision().lens).toBe('values_needs')
    expect(decision().currentStep).toBe(6)
  })

  it('continue goes on to Future Projection', async () => {
    const r = await chooseLensStep.handle(ctx({ continue: true }))
    expect(r.nextStepId).toBe('FUTURE_PROJECTION')
    expect(decision().currentStep).toBe(7)
  })

  it('rejects anything else', async () => {
    await expect(chooseLensStep.handle(ctx({ continue: false }))).rejects.toMatchObject({ statusCode: 400 })
    await expect(chooseLensStep.handle(ctx({}))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('lens summaries return to CHOOSE_LENS', () => {
  it('records each lens once, in order, and returns to the cards', async () => {
    await chooseLensStep.handle(ctx({ lens: 'fears_desires' }))
    const a = await deepExplorationSummaryStep.handle(ctx({}))
    expect(a.nextStepId).toBe('CHOOSE_LENS')
    expect(decision().currentStep).toBe(4)
    await valuesNeedsSummaryStep.handle(ctx({}))
    await chooseLensStep.handle(ctx({ lens: 'fears_desires' }))
    await deepExplorationSummaryStep.handle(ctx({})) // revisiting doesn't duplicate
    expect(decision().completedLenses).toEqual(['fears_desires', 'values_needs'])
  })

  it('counts a pre-2026-09-28 values_needs Step05 run as Fears & Desires', async () => {
    items.set(Sk.decisionRoom(SID), { ...decision(), lens: 'values_needs' })
    await deepExplorationSummaryStep.handle(ctx({}))
    expect(decision().completedLenses).toEqual(['fears_desires'])
  })

  it('addLens keeps order and never duplicates', () => {
    expect(addLens(undefined, 'pros_cons')).toEqual(['pros_cons'])
    expect(addLens(['pros_cons'], 'pros_cons')).toEqual(['pros_cons'])
    expect(addLens(['pros_cons'], 'values_needs')).toEqual(['pros_cons', 'values_needs'])
  })
})

describe('DEEP_EXPLORATION keeps the other lens', () => {
  it("saving Fears & Desires leaves Pros & Cons tags alone (and the reverse)", async () => {
    await chooseLensStep.handle(ctx({ lens: 'pros_cons' }))
    await deepExplorationStep.handle(ctx({ tagsA: { pro: tag('pay'), con: tag('hours') }, tagsB: { pro: tag('team'), con: tag('slow') } }))
    await chooseLensStep.handle(ctx({ lens: 'fears_desires' }))
    // The client sends every bucket it holds, including the other lens's.
    await deepExplorationStep.handle(
      ctx({
        tagsA: { pro: tag('pay'), con: tag('hours'), desire: tag('growth'), fear: tag('failing') },
        tagsB: { pro: tag('team'), con: tag('slow'), desire: tag('ease'), fear: tag('stagnating') },
      })
    )
    expect(tagTypes()).toEqual(['A:con', 'A:desire', 'A:fear', 'A:pro', 'B:con', 'B:desire', 'B:fear', 'B:pro'])
    await chooseLensStep.handle(ctx({ lens: 'pros_cons' }))
    await deepExplorationStep.handle(ctx({ tagsA: { pro: tag('pay2'), con: tag('hours') }, tagsB: { pro: tag('team'), con: tag('slow') } }))
    expect(tagTypes().filter((t) => t.endsWith('desire') || t.endsWith('fear'))).toHaveLength(4)
  })
})
