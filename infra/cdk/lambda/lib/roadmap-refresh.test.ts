import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import type { SessionCrypto } from './session-crypto'

/**
 * Session 68: the Roadmap follows every completed Room session instead of
 * staying on whatever onboarding (or the first session) produced.
 */

const gather = vi.fn()
vi.mock('../continuity/gather-context', () => ({ gatherContinuityContext: (...a: unknown[]) => gather(...a) }))
vi.mock('./prompt-registry', () => ({ resolvePromptVersion: vi.fn(async () => ({ name: 'refresh' })) }))
const callModel = vi.fn()
vi.mock('./model-call', () => ({ callPromptModel: (...a: unknown[]) => callModel(...a) }))

import { refreshRoadmapAfterSession } from './roadmap-refresh'

const ddbMock = mockClient(DynamoDBDocumentClient)
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const crypto = {
  encryptField: async (value: unknown) => ({ __enc: value }),
  decryptField: async (blob: { __enc: unknown }) => blob.__enc,
} as unknown as SessionCrypto
const PK = 'USER#u1'
const FIRST = { currentFocus: 'Job offer', theme: 'Security vs growth', direction: 'Trusting yourself', suggestedSpaces: [] }

function run() {
  return refreshRoadmapAfterSession(ddb, 'T', 'P', PK, crypto, 'Respond in English.')
}

describe('refreshRoadmapAfterSession', () => {
  beforeEach(() => {
    ddbMock.reset()
    gather.mockReset()
    callModel.mockReset()
    gather.mockResolvedValue({
      confirmedSignals: [],
      sessionSummaries: [
        { summary: 'Decision: Move to Haifa?', createdAt: '2026-09-24T10:00:00.000Z' },
        { summary: 'Decision: Job offer', createdAt: '2026-09-01T10:00:00.000Z' },
      ],
      openThreads: [],
    })
    callModel.mockResolvedValue({
      currentFocus: 'Whether to move to Haifa',
      theme: 'Security vs growth',
      direction: 'Choosing from trust',
      suggestedSpaces: ['Decision Room', 'Not a space'],
    })
  })

  it('rewrites the live roadmap from the latest sessions, bumps the version, and clears a pending proposal', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'ROADMAP', content: { __enc: FIRST }, version: 3, lifecycleState: 'evolving' } })
    await run()

    const prompt = callModel.mock.calls[0][1] as Record<string, string>
    expect(prompt.currentFocus).toBe('Job offer')
    expect(prompt.recentSessions.indexOf('Move to Haifa')).toBeLessThan(prompt.recentSessions.indexOf('Job offer'))
    expect(prompt.confirmedSignals).toBe('(none confirmed yet)')

    const put = ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as Record<string, unknown>
    expect(put.version).toBe(4)
    expect(put.lifecycleState).toBe('active')
    expect(put.content).toEqual({
      __enc: { currentFocus: 'Whether to move to Haifa', theme: 'Security vs growth', direction: 'Choosing from trust', suggestedSpaces: ['Decision Room'] },
    })
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1)
  })

  it('creates a roadmap when onboarding never wrote one', async () => {
    ddbMock.on(GetCommand).resolves({})
    await run()
    expect((callModel.mock.calls[0][1] as Record<string, string>).currentFocus).toBe('(none yet)')
    expect((ddbMock.commandCalls(PutCommand)[0].args[0].input.Item as Record<string, unknown>).version).toBe(1)
  })

  it.each(['paused', 'archived'])('leaves a %s roadmap alone', async (lifecycleState) => {
    ddbMock.on(GetCommand).resolves({ Item: { pk: PK, sk: 'ROADMAP', content: { __enc: FIRST }, version: 1, lifecycleState } })
    await run()
    expect(callModel).not.toHaveBeenCalled()
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)
  })

  it('writes nothing when the model output is incomplete, and never throws', async () => {
    ddbMock.on(GetCommand).resolves({})
    callModel.mockResolvedValueOnce({ currentFocus: 'x', theme: '', direction: 'y' })
    await run()
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0)

    callModel.mockRejectedValueOnce(new Error('bedrock down'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(run()).resolves.toBeUndefined()
    err.mockRestore()
  })
})
