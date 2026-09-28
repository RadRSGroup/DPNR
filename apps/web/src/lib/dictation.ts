/**
 * Shared talk-to-text engine (Web Speech API) for Main Chat's composer and
 * every `Dictatable` field. Client-only: the browser's own speech service
 * transcribes (Chrome/Edge send audio to Google/Microsoft; Safari to Apple);
 * nothing goes to DPNR's backend.
 *
 * Mobile hardening (Session 77, "doesn't work on my phone"):
 * - interim results ON, but only final text is inserted. iOS Safari often
 *   never delivers a final result with interimResults=false, so if the
 *   session ends with only interim text, that text is used instead.
 * - Never focus the field while listening: focusing opens the on-screen
 *   keyboard, which on iOS interrupts the audio session and ends
 *   recognition at once. The caller focuses the field after it ends.
 * - Errors are reported (mic blocked, nothing heard, service unavailable)
 *   instead of the button silently resetting.
 * - One microphone at a time across the page.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- no lib.dom typings for the webkit-prefixed Web Speech API */

export type DictationError = 'blocked' | 'no_speech' | 'unavailable'

export function speechRecognitionCtor(): any | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
}

let active: { stop: () => void } | null = null

export interface DictationHandle {
  stop: () => void
}

export function startDictation(opts: {
  locale: string
  onText: (text: string) => void
  onEnd: () => void
  onError: (error: DictationError) => void
}): DictationHandle | null {
  const Ctor = speechRecognitionCtor()
  if (!Ctor) return null
  active?.stop()

  const recognition = new Ctor()
  recognition.lang = opts.locale === 'he' ? 'he-IL' : 'en-US'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  let finalText = ''
  let interimText = ''
  let errored = false
  let ended = false
  let stopped = false // stop() by the person or by another mic: not an error

  recognition.onresult = (e: any) => {
    let interim = ''
    for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
      const r = e.results[i]
      const t = String(r[0]?.transcript ?? '')
      if (r.isFinal) finalText += (finalText ? ' ' : '') + t.trim()
      else interim += t
    }
    interimText = interim.trim()
  }
  recognition.onerror = (e: any) => {
    errored = true
    const code = String(e?.error ?? '')
    if (code === 'aborted') return // our own stop()
    opts.onError(
      code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture'
        ? 'blocked'
        : code === 'no-speech'
          ? 'no_speech'
          : 'unavailable'
    )
  }
  recognition.onend = () => {
    if (ended) return
    ended = true
    const text = (finalText || interimText).trim()
    if (text) opts.onText(text)
    else if (!errored && !stopped) opts.onError('no_speech')
    if (active === handle) active = null
    opts.onEnd()
  }

  const handle: DictationHandle = {
    stop: () => {
      stopped = true
      recognition.stop()
    },
  }
  active = handle
  try {
    recognition.start()
  } catch {
    active = null
    opts.onError('unavailable')
    return null
  }
  return handle
}
