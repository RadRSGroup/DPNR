import { describe, it, expect, beforeEach, vi } from 'vitest'
import { startDictation, speechRecognitionCtor } from './dictation'

// A stand-in for the browser's webkitSpeechRecognition.
class FakeRecognition {
  static instances: FakeRecognition[] = []
  lang = ''
  interimResults = false
  continuous = true
  maxAlternatives = 0
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  started = false
  constructor() {
    FakeRecognition.instances.push(this)
  }
  start() {
    this.started = true
  }
  stop() {
    this.onend?.()
  }
  // test helpers
  result(chunks: { t: string; final: boolean }[], resultIndex = 0) {
    this.onresult?.({ resultIndex, results: chunks.map((c) => Object.assign([{ transcript: c.t }], { isFinal: c.final })) })
  }
}

function setup() {
  const onText = vi.fn()
  const onEnd = vi.fn()
  const onError = vi.fn()
  const handle = startDictation({ locale: 'en', onText, onEnd, onError })
  return { onText, onEnd, onError, handle, rec: FakeRecognition.instances.at(-1)! }
}

beforeEach(() => {
  FakeRecognition.instances = []
  ;(globalThis as unknown as { window: unknown }).window = { webkitSpeechRecognition: FakeRecognition }
})

describe('startDictation', () => {
  it('uses interim results, single-shot, and the UI language', () => {
    const { rec } = setup()
    expect(rec.interimResults).toBe(true)
    expect(rec.continuous).toBe(false)
    expect(rec.lang).toBe('en-US')
    startDictation({ locale: 'he', onText() {}, onEnd() {}, onError() {} })
    expect(FakeRecognition.instances.at(-1)!.lang).toBe('he-IL')
  })

  it('inserts the final text once, at the end', () => {
    const { rec, onText, onEnd } = setup()
    rec.result([{ t: 'hello', final: false }])
    rec.result([{ t: 'hello there', final: true }])
    expect(onText).not.toHaveBeenCalled()
    rec.onend?.()
    expect(onText).toHaveBeenCalledWith('hello there')
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('falls back to interim text when no final result arrives (iOS Safari)', () => {
    const { rec, onText, onError } = setup()
    rec.result([{ t: 'only interim words', final: false }])
    rec.onend?.()
    expect(onText).toHaveBeenCalledWith('only interim words')
    expect(onError).not.toHaveBeenCalled()
  })

  it('reports a blocked microphone and nothing heard, instead of failing silently', () => {
    let s = setup()
    s.rec.onerror?.({ error: 'not-allowed' })
    s.rec.onend?.()
    expect(s.onError).toHaveBeenCalledWith('blocked')
    expect(s.onText).not.toHaveBeenCalled()

    s = setup()
    s.rec.onerror?.({ error: 'service-not-allowed' }) // iOS with Dictation off
    expect(s.onError).toHaveBeenCalledWith('blocked')

    s = setup()
    s.rec.onend?.() // the browser ended it with no words and no error
    expect(s.onError).toHaveBeenCalledWith('no_speech')

    s = setup()
    s.handle!.stop() // the person tapped stop before speaking
    expect(s.onError).not.toHaveBeenCalled()
  })

  it('stops a previous microphone when another starts, without an error for it', () => {
    const first = setup()
    const second = setup()
    expect(first.onEnd).toHaveBeenCalledTimes(1)
    expect(first.onError).not.toHaveBeenCalled() // a stop someone asked for isn't an error
    expect(second.rec.started).toBe(true)
  })

  it('is unavailable without the API', () => {
    ;(globalThis as unknown as { window: unknown }).window = {}
    expect(speechRecognitionCtor()).toBeNull()
    expect(startDictation({ locale: 'en', onText() {}, onEnd() {}, onError() {} })).toBeNull()
  })
})
