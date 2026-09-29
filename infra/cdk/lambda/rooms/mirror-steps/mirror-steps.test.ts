import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { SessionCrypto } from '../../lib/session-crypto'
import type { StepContext } from '../types'

/**
 * Wave 2 Slice 3 (Session 72): entry-aware Mirror (#34), the synthesis kept
 * across resume, and emotion + body-map capture (#35).
 */

const modelVars: Record<string, string>[] = []
vi.mock('../../lib/prompt-registry', () => ({
  resolvePromptVersion: vi.fn(async () => ({ sk: 'VERSION#0002' })),
  promptRef: vi.fn(() => 'mirror_room/x@v2'),
}))
vi.mock('../../lib/model-call', () => ({
  callPromptModel: vi.fn(async (_v: unknown, vars: Record<string, string>) => {
    modelVars.push(vars)
    return 'A generated reflection.'
  }),
}))

// COMMITMENT's side effects: capture what would reach Twin extraction and the
// stored session summary (Mirror depth slice 2 keeps every depth answer out).
const twinSummaries: string[] = []
vi.mock('../twin-signals', () => ({
  extractCandidateSignals: vi.fn(async (...args: unknown[]) => { twinSummaries.push(args[5] as string); return [] }),
  persistSessionSummary: vi.fn(async (...args: unknown[]) => { twinSummaries.push(args[3] as string) }),
}))
vi.mock('../../lib/credits', () => ({ grantCredits: vi.fn(async () => undefined), EARN_REFLECTION_COMPLETED_CREDITS: 1 }))
vi.mock('../../lib/roadmap-refresh', () => ({ refreshRoadmapAfterSession: vi.fn(async () => undefined) }))

import { situationStep } from './situation'
import { automaticReactionStep } from './automatic-reaction'
import { patternStep } from './pattern'
import { synthesisStep } from './synthesis'
import { commitmentStep } from './commitment'
import { withAnswers, formatEntryContext, formatEmotion, formatBody, formatDepthContext, type MirrorContent } from './helpers'

const ddbMock = mockClient(DynamoDBDocumentClient)
const PK = 'USER#u1'
const SID = 'm1'
const crypto = {
  encryptField: async (value: unknown) => ({ __enc: value }),
  decryptField: async (blob: { __enc: unknown }) => blob.__enc,
} as unknown as SessionCrypto

const BASE: MirrorContent = {
  situation: 'My manager moved the deadline', trigger: 'No warning', thought: 'I can never relax',
  emotion: '', bodyResponse: '', automaticReaction: 'Said yes', copingResponse: 'Worked late',
  recurringPattern: 'With authority', energyMoodEffect: 'Drained', lifeDomain: 'Work', commitment: '',
}

let stored: Record<string, unknown> | undefined
function ctx(action: StepContext['action'], input: Record<string, unknown>): StepContext {
  return { pk: PK, sessionId: SID, action, input, crypto, languageInstruction: 'Reply in English.' }
}
function storedContent(): MirrorContent {
  return (stored?.content as { __enc: MirrorContent }).__enc
}

beforeEach(() => {
  ddbMock.reset()
  modelVars.length = 0
  twinSummaries.length = 0
  stored = undefined
  ddbMock.on(GetCommand).callsFake(() => ({ Item: stored }))
  ddbMock.on(PutCommand).callsFake((input: { Item: Record<string, unknown> }) => {
    stored = input.Item
    return {}
  })
})

function seed(content: MirrorContent) {
  stored = { pk: PK, sk: `ROOM#MIRROR#${SID}`, mirrorId: SID, status: 'active', content: { __enc: content }, createdAt: '2026-09-27T00:00:00.000Z', updatedAt: '2026-09-27T00:00:00.000Z' }
}

describe('helpers', () => {
  it('withAnswers drops the stored synthesis only when an answer changes', () => {
    const withSynth = { ...BASE, synthesis: 'kept' }
    expect(withAnswers(withSynth, { lifeDomain: 'Work' }).synthesis).toBe('kept')
    expect(withAnswers(withSynth, { lifeDomain: 'Family' }).synthesis).toBeUndefined()
    expect(withAnswers(withSynth, { emotionsFelt: [{ label: 'Fear', color: '#a855f7' }] }).synthesis).toBeUndefined()
  })

  it('formats entry context per mode (Appendix B)', () => {
    expect(formatEntryContext({ mode: 'pattern', patternName: 'People-Pleasing', patternDescription: 'You say yes first' }))
      .toContain('Do not identify or name the pattern for them again')
    expect(formatEntryContext({ mode: 'archetype', archetype: 'Protector' })).toContain('Protector')
    expect(formatEntryContext(undefined)).toContain('describing a situation')
    // A pattern entry with nothing kept falls back to the situation framing.
    expect(formatEntryContext({ mode: 'pattern' })).toContain('describing a situation')
  })

  // Session 77 (#33): only a confirmed signal is ever described as confirmed.
  it('describes a pattern entry truthfully per source', () => {
    const base = { mode: 'pattern' as const, patternName: 'People-Pleasing', patternDescription: 'd' }
    expect(formatEntryContext({ ...base, patternSource: 'confirmed' })).toContain('have confirmed')
    for (const patternSource of ['exploring', 'reference'] as const) {
      const text = formatEntryContext({ ...base, patternSource })
      expect(text).not.toMatch(/\bconfirmed:/)
      expect(text).toContain('leave room for it not to fit')
    }
    expect(formatEntryContext({ ...base, patternSource: 'reference' })).toContain('general pattern list')
    expect(formatEntryContext({ ...base, patternSource: 'exploring' })).toContain('not confirmed yet')
    // Legacy entries (no source) no longer claim "confirmed" either.
    expect(formatEntryContext(base)).not.toContain('confirmed')
  })

  it('asks for a tentative, optional pattern only when the person asked for help', () => {
    const help = formatEntryContext({ mode: 'situation', helpIdentify: true })
    expect(help).toContain('Does that feel relevant?')
    expect(help).toContain("don't name one")
    expect(formatEntryContext({ mode: 'situation' })).not.toContain('possible pattern')
    // A known pattern wins over the help flag.
    expect(formatEntryContext({ mode: 'pattern', patternName: 'X', patternSource: 'confirmed', helpIdentify: true })).not.toContain('possible pattern')
  })

  it('keeps patternSource and helpIdentify when stored, and rejects an unknown source', async () => {
    const entry = { mode: 'pattern', patternName: 'Avoidance', patternDescription: 'd', patternSource: 'reference' }
    await situationStep.handle(ctx('SUBMIT_STEP', { situation: 's', trigger: 't', entry }))
    expect(storedContent().entry).toEqual(entry)
    await situationStep.handle(ctx('SUBMIT_STEP', { situation: 's', trigger: 't', entry: { mode: 'situation', helpIdentify: true } }))
    expect(storedContent().entry).toEqual({ mode: 'situation', helpIdentify: true })
    await expect(situationStep.handle(ctx('SUBMIT_STEP', { situation: 's', trigger: 't', entry: { mode: 'pattern', patternSource: 'guessed' } })))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('formats emotion and body from chips, placements and words', () => {
    const c = { emotion: 'tight', bodyResponse: '', emotionsFelt: [{ label: 'Fear', color: '#a855f7' }, { label: 'Anger', color: '#ef4444' }],
      bodyPlacements: [{ area: 'Chest' as const, emotion: 'Fear' }, { area: 'Throat' as const, emotion: 'Fear' }, { area: 'Hands' as const, emotion: 'Anger' }] }
    expect(formatEmotion(c)).toBe('chose Fear, Anger; in their words: "tight"')
    expect(formatBody(c)).toBe('placed on the body map: Fear in Chest, Throat; Anger in Hands')
    expect(formatBody({ bodyResponse: '' })).toBe('not said')
  })
})

describe('SITUATION entry', () => {
  it('stores the entry inside the encrypted content, and keeps it on a resubmit without one', async () => {
    const entry = { mode: 'pattern', patternName: 'People-Pleasing', patternDescription: 'You say yes first' }
    await situationStep.handle(ctx('SUBMIT_STEP', { situation: 's', trigger: 't', entry }))
    expect(storedContent().entry).toEqual(entry)
    expect(stored?.entry).toBeUndefined() // never a plaintext attribute
    await situationStep.handle(ctx('SUBMIT_STEP', { situation: 's2', trigger: 't' }))
    expect(storedContent().entry).toEqual(entry)
    expect(storedContent().situation).toBe('s2')
  })

  it('rejects an unknown entry mode', async () => {
    await expect(situationStep.handle(ctx('SUBMIT_STEP', { situation: 's', trigger: 't', entry: { mode: 'free' } }))).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('AUTOMATIC_REACTION emotion + body', () => {
  const fear = { label: 'Fear', color: '#a855f7' }

  it('accepts chips + placements with no free text, and drops placements for emotions not chosen', async () => {
    seed(BASE)
    await automaticReactionStep.handle(ctx('SUBMIT_STEP', {
      thought: 'th', automaticReaction: 'ar', emotionsFelt: [fear],
      bodyPlacements: [{ area: 'Chest', emotion: 'Fear' }, { area: 'Chest', emotion: 'Fear' }, { area: 'Legs', emotion: 'Joy' }],
    }))
    const c = storedContent()
    expect(c.emotionsFelt).toEqual([fear])
    expect(c.bodyPlacements).toEqual([{ area: 'Chest', emotion: 'Fear' }])
    expect(c.emotion).toBe('')
  })

  it('still accepts the old text-only shape', async () => {
    seed(BASE)
    await automaticReactionStep.handle(ctx('SUBMIT_STEP', { thought: 'th', emotion: 'scared', bodyResponse: 'chest', automaticReaction: 'ar' }))
    expect(storedContent().emotion).toBe('scared')
    expect(storedContent().emotionsFelt).toBeUndefined()
  })

  it('needs an emotion and a body answer in some form', async () => {
    seed(BASE)
    await expect(automaticReactionStep.handle(ctx('SUBMIT_STEP', { thought: 'th', bodyResponse: 'chest', automaticReaction: 'ar' })))
      .rejects.toMatchObject({ code: 'emotion_required' })
    await expect(automaticReactionStep.handle(ctx('SUBMIT_STEP', { thought: 'th', emotionsFelt: [fear], automaticReaction: 'ar' })))
      .rejects.toMatchObject({ code: 'body_required' })
    await expect(automaticReactionStep.handle(ctx('SUBMIT_STEP', { thought: 'th', emotionsFelt: [{ label: 'Fear', color: 'purple' }], bodyResponse: 'x', automaticReaction: 'ar' })))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('REFINE sends formatted emotion/body and the entry context to the prompt', async () => {
    seed({ ...BASE, entry: { mode: 'archetype', archetype: 'Protector' } })
    await automaticReactionStep.handle(ctx('REFINE', { thought: 'th', emotionsFelt: [fear], bodyPlacements: [{ area: 'Throat', emotion: 'Fear' }] }))
    expect(modelVars[0].emotion).toBe('chose Fear')
    expect(modelVars[0].bodyResponse).toBe('placed on the body map: Fear in Throat')
    expect(modelVars[0].entryContext).toContain('Protector')
  })
})

describe('SYNTHESIS kept on resume', () => {
  it('REFINE saves the generated synthesis; an unchanged earlier resubmit keeps it, a change clears it', async () => {
    seed(BASE)
    const res = await synthesisStep.handle(ctx('REFINE', {}))
    expect(res.result).toEqual({ synthesis: 'A generated reflection.' })
    expect(storedContent().synthesis).toBe('A generated reflection.')
    expect(modelVars[0].entryContext).toContain('describing a situation')

    await patternStep.handle(ctx('SUBMIT_STEP', { copingResponse: BASE.copingResponse, recurringPattern: BASE.recurringPattern }))
    expect(storedContent().synthesis).toBe('A generated reflection.')
    await patternStep.handle(ctx('SUBMIT_STEP', { copingResponse: 'Called a friend', recurringPattern: BASE.recurringPattern }))
    expect(storedContent().synthesis).toBeUndefined()
  })
})

describe('Mirror depth slice 2 (optional depth answers)', () => {
  const core = { copingResponse: BASE.copingResponse, recurringPattern: BASE.recurringPattern }

  it('PATTERN stores emotionUnderneath; absent keeps it, an empty string clears it', async () => {
    seed(BASE)
    await patternStep.handle(ctx('SUBMIT_STEP', { ...core, emotionUnderneath: '  hurt  ' }))
    expect(storedContent().emotionUnderneath).toBe('hurt')
    await patternStep.handle(ctx('SUBMIT_STEP', core))
    expect(storedContent().emotionUnderneath).toBe('hurt')
    await patternStep.handle(ctx('SUBMIT_STEP', { ...core, emotionUnderneath: '' }))
    expect(storedContent().emotionUnderneath).toBeUndefined()
  })

  it('an unanswered depth field sent as "" does not drop the synthesis', async () => {
    seed({ ...BASE, synthesis: 'kept' })
    await patternStep.handle(ctx('SUBMIT_STEP', { ...core, emotionUnderneath: '' }))
    expect(storedContent().synthesis).toBe('kept')
  })

  it('SYNTHESIS REFINE saves payoff/belief/origin and gives them to the prompt', async () => {
    seed({ ...BASE, emotionUnderneath: 'hurt' })
    await synthesisStep.handle(ctx('REFINE', { payoff: 'kept me safe', deeperBelief: "I'm too much", origin: 'my dad' }))
    const c = storedContent()
    expect([c.payoff, c.deeperBelief, c.origin, c.synthesis]).toEqual(['kept me safe', "I'm too much", 'my dad', 'A generated reflection.'])
    expect(modelVars[0].depthContext).toContain('"hurt"')
    expect(modelVars[0].depthContext).toContain('"kept me safe"')
    expect(modelVars[0].depthContext).toContain('"my dad"')
  })

  it('SYNTHESIS REFINE with {} keeps stored answers and says when they did not go deeper', async () => {
    seed({ ...BASE, payoff: 'p' })
    await synthesisStep.handle(ctx('REFINE', {}))
    expect(storedContent().payoff).toBe('p')
    expect(formatDepthContext(BASE)).toBe('They did not go deeper this time.')
  })

  it('a changed depth answer invalidates the old synthesis before regenerating', async () => {
    seed({ ...BASE, payoff: 'old', synthesis: 'old synthesis' })
    await synthesisStep.handle(ctx('REFINE', { payoff: 'new' }))
    expect(storedContent().synthesis).toBe('A generated reflection.')
    expect(modelVars[0].depthContext).toContain('"new"')
  })

  it('rejects an over-long depth answer', async () => {
    seed(BASE)
    await expect(synthesisStep.handle(ctx('REFINE', { origin: 'x'.repeat(5001) }))).rejects.toMatchObject({ statusCode: 400 })
  })

  it('COMMITMENT stores support, and no depth answer or support reaches Twin extraction or the session summary', async () => {
    seed({ ...BASE, emotionUnderneath: 'UNDERNEATH', payoff: 'PAYOFF', deeperBelief: 'BELIEF', origin: 'ORIGIN' })
    await commitmentStep.handle(ctx('SUBMIT_STEP', { commitment: 'Pause first', support: 'SUPPORT' }))
    expect(storedContent().support).toBe('SUPPORT')
    expect(storedContent().origin).toBe('ORIGIN')
    expect(twinSummaries).toHaveLength(2)
    for (const summary of twinSummaries) {
      expect(summary).toContain('Commitment: Pause first')
      for (const secret of ['UNDERNEATH', 'PAYOFF', 'BELIEF', 'ORIGIN', 'SUPPORT']) expect(summary).not.toContain(secret)
    }
  })
})
