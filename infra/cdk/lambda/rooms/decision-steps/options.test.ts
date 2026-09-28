import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, BatchWriteCommand, DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk } from '@dpnr/shared-types'
import type { SessionCrypto } from '../../lib/session-crypto'
import type { StepContext } from '../types'
import { DECISION_ROOM_PROMPT_SEEDS } from '../../../scripts/decision-room-prompts.seed'

/**
 * Up to three options per decision (founder feedback 2026-09-28 #2): A and
 * B stay required, C is optional, and a decision without C behaves exactly
 * as before (old clients never send C).
 */

vi.mock('../../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ sk: 'VERSION#0001' })),
  promptRef: vi.fn(() => 'decision_room/x@v1'),
}))
const callPromptModel = vi.fn(async (..._args: unknown[]) => ({ wordFromUs: 'w', reflection: 'r' }))
vi.mock('../../lib/model-call', () => ({ callPromptModel: (...args: unknown[]) => callPromptModel(...args) }))

import { mapOptionsStep } from './map-options'
import { deepExplorationStep } from './deep-exploration'
import { valuesNeedsStep } from './values-needs'
import { futureProjectionStep } from './future-projection'
import { deepExplorationSummaryStep } from './section-summary'

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
const labels = (kind: 'OPTION' | 'TAG' | 'PROJECTION') =>
  [...items.values()]
    .filter((i) => String(i.sk).includes(`#${kind}#`))
    .map((i) => String(kind === 'OPTION' ? i.label : i.optionLabel))
    .sort()
const tag = (label: string) => [{ label, aiSuggested: false }]
const opt = (content: string, approved = true) => ({ content, approved })

function putOption(label: 'A' | 'B' | 'C', content: string) {
  items.set(Sk.decisionOption(SID, label), {
    pk: PK, sk: Sk.decisionOption(SID, label), label, approved: true, content: { __enc: { content } }, createdAt: 'x',
  })
}

beforeEach(() => {
  ddbMock.reset()
  callPromptModel.mockClear()
  items = new Map()
  items.set(Sk.decisionRoom(SID), {
    pk: PK,
    sk: Sk.decisionRoom(SID),
    decisionId: SID,
    status: 'active',
    currentStep: 2,
    lens: 'pros_cons',
    reviewDate: null,
    content: { __enc: { title: 'Which path?', subtitle: null, narrative: 'Three ways forward.' } },
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
  ddbMock.on(BatchWriteCommand).callsFake((input: { RequestItems: Record<string, { DeleteRequest: { Key: { sk: string } } }[]> }) => {
    for (const reqs of Object.values(input.RequestItems)) for (const r of reqs) items.delete(r.DeleteRequest.Key.sk)
    return {}
  })
  ddbMock.on(QueryCommand).callsFake((input: { ExpressionAttributeValues: Record<string, string> }) => ({
    Items: [...items.values()].filter((i) => String(i.sk).startsWith(input.ExpressionAttributeValues[':prefix'] ?? '\u0000')),
  }))
})

describe('MAP_OPTIONS', () => {
  it('stores a third option when one is sent', async () => {
    const r = await mapOptionsStep.handle(ctx({ narrative: 'n', optionA: opt('Stay'), optionB: opt('Move'), optionC: opt('Wait a year') }))
    expect(r.nextStepId).toBe('BODY_EMOTION')
    expect(labels('OPTION')).toEqual(['A', 'B', 'C'])
    expect(r.result).toMatchObject({ optionC: 'Wait a year' })
  })

  it('keeps two options working exactly as before', async () => {
    await mapOptionsStep.handle(ctx({ narrative: 'n', optionA: opt('Stay'), optionB: opt('Move') }))
    expect(labels('OPTION')).toEqual(['A', 'B'])
  })

  it('requires Option C to be approved too', async () => {
    await expect(
      mapOptionsStep.handle(ctx({ narrative: 'n', optionA: opt('Stay'), optionB: opt('Move'), optionC: opt('Wait', false) }))
    ).rejects.toMatchObject({ code: 'options_not_approved' })
  })

  it('removing Option C deletes it with its tags and projections, and leaves A/B alone', async () => {
    putOption('C', 'Wait')
    for (const [id, label] of [['t1', 'A'], ['t2', 'C']] as const) {
      items.set(Sk.decisionTag(SID, id), { pk: PK, sk: Sk.decisionTag(SID, id), optionLabel: label, tagType: 'pro' })
    }
    items.set(Sk.decisionProjection(SID, 'p1'), { pk: PK, sk: Sk.decisionProjection(SID, 'p1'), optionLabel: 'C' })
    await mapOptionsStep.handle(ctx({ narrative: 'n', optionA: opt('Stay'), optionB: opt('Move') }))
    expect(labels('OPTION')).toEqual(['A', 'B'])
    expect(labels('TAG')).toEqual(['A'])
    expect(labels('PROJECTION')).toEqual([])
  })
})

describe('per-option steps with a third option', () => {
  beforeEach(() => {
    putOption('A', 'Stay')
    putOption('B', 'Move')
  })

  it('DEEP_EXPLORATION requires C tags only when the decision has C', async () => {
    const ab = { tagsA: { pro: tag('a'), con: tag('a') }, tagsB: { pro: tag('b'), con: tag('b') } }
    await deepExplorationStep.handle(ctx(ab))
    expect(labels('TAG')).toEqual(['A', 'A', 'B', 'B'])

    putOption('C', 'Wait')
    await expect(deepExplorationStep.handle(ctx(ab))).rejects.toMatchObject({ code: 'tags_required' })
    await deepExplorationStep.handle(ctx({ ...ab, tagsC: { pro: tag('c'), con: tag('c') } }))
    expect(labels('TAG')).toEqual(['A', 'A', 'B', 'B', 'C', 'C'])
  })

  it('VALUES_NEEDS requires C values and needs only when the decision has C', async () => {
    const ab = { valuesA: tag('a'), needsA: tag('a'), valuesB: tag('b'), needsB: tag('b') }
    putOption('C', 'Wait')
    await expect(valuesNeedsStep.handle(ctx(ab))).rejects.toMatchObject({ code: 'tags_required' })
    await valuesNeedsStep.handle(ctx({ ...ab, valuesC: tag('c'), needsC: tag('c') }))
    expect(labels('TAG')).toEqual(['A', 'A', 'B', 'B', 'C', 'C'])
  })

  it('FUTURE_PROJECTION stores C projections and allows leaning toward C', async () => {
    const p = (s: string) => [{ statement: s, isCustom: false }]
    const base = { projectionsA: p('a'), projectionsB: p('b') }
    await expect(futureProjectionStep.handle(ctx({ ...base, chosenLean: 'C' }))).rejects.toMatchObject({ code: 'invalid_lean' })

    putOption('C', 'Wait')
    await expect(futureProjectionStep.handle(ctx({ ...base, chosenLean: 'A' }))).rejects.toMatchObject({ code: 'projections_required' })
    await futureProjectionStep.handle(ctx({ ...base, projectionsC: p('c'), chosenLean: 'C' }))
    expect(labels('PROJECTION')).toEqual(['A', 'B', 'C'])
    const outcome = [...items.values()].find((i) => String(i.sk).includes('#OUTCOME#'))
    expect(outcome?.chosenOptionLabel).toBe('C')
  })

  it('REFINE accepts Option C', async () => {
    putOption('C', 'Wait')
    await deepExplorationStep.handle(ctx({ optionLabel: 'C' }, 'REFINE'))
    expect(callPromptModel.mock.calls[0][1]).toMatchObject({ optionLabel: 'C', optionText: 'Wait' })
  })
})

describe('summary prompts', () => {
  beforeEach(() => {
    putOption('A', 'Stay')
    putOption('B', 'Move')
  })

  it('send an empty optionCBlock for two options and the C lines for three', async () => {
    await deepExplorationSummaryStep.handle(ctx({}, 'REFINE'))
    expect(callPromptModel.mock.calls[0][1]).toMatchObject({ optionCBlock: '' })

    putOption('C', 'Wait')
    items.set(Sk.decisionTag(SID, 't'), { pk: PK, sk: Sk.decisionTag(SID, 't'), optionLabel: 'C', tagType: 'pro', content: { __enc: { label: 'Time' } } })
    await deepExplorationSummaryStep.handle(ctx({}, 'REFINE'))
    expect(callPromptModel.mock.calls[1][1]).toMatchObject({ optionCBlock: '\nOption C: "Wait"\nOption C selections: Time' })
  })

  it('every decision_room template variable is declared (an undeclared one throws in fillTemplate)', () => {
    for (const seed of DECISION_ROOM_PROMPT_SEEDS) {
      const used = [...`${seed.systemTemplate}\n${seed.userTemplate}`.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
      for (const v of used) expect(seed.variables, `${seed.name} uses {{${v}}}`).toContain(v)
    }
  })
})
