import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockClient } from 'aws-sdk-client-mock'
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { sendConverse, isModelFailure } from './model-call'
import { HttpError } from './http'

/** Slice 6: Bedrock outages surface as 503 model_unavailable, never with content in the log line. */

const bedrockMock = mockClient(BedrockRuntimeClient)
const command = new ConverseCommand({ modelId: 'm', messages: [] })

function named(name: string): Error {
  const err = new Error('secret user text should never be logged')
  err.name = name
  return err
}

beforeEach(() => {
  bedrockMock.reset()
  vi.restoreAllMocks()
})

describe('sendConverse', () => {
  it.each(['ThrottlingException', 'ServiceUnavailableException', 'ModelNotReadyException', 'ModelTimeoutException', 'InternalServerException'])(
    'maps %s to 503 model_unavailable',
    async (name) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      bedrockMock.on(ConverseCommand).rejects(named(name))
      await expect(sendConverse('PROMPT#companion#respond', command)).rejects.toMatchObject({ statusCode: 503, code: 'model_unavailable' })
      expect(warn).toHaveBeenCalledWith('[MODEL_UNAVAILABLE]', { errorName: name, prompt: 'PROMPT#companion#respond' })
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret')
    }
  )

  it('passes other errors through unchanged', async () => {
    bedrockMock.on(ConverseCommand).rejects(named('ValidationException'))
    await expect(sendConverse('p', command)).rejects.toMatchObject({ name: 'ValidationException' })
  })
})

describe('isModelFailure', () => {
  it('is true only for the two model error codes', () => {
    expect(isModelFailure(new HttpError(503, 'model_unavailable', ''))).toBe(true)
    expect(isModelFailure(new HttpError(502, 'model_call_failed', ''))).toBe(true)
    expect(isModelFailure(new HttpError(402, 'credits_exhausted', ''))).toBe(false)
    expect(isModelFailure(new Error('x'))).toBe(false)
  })
})
