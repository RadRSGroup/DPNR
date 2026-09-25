import { describe, it, expect, beforeEach } from 'vitest'
import { ACTIVE_WINDOW_MS, addTime, classifyTick, localDay } from './time-on-dpnr'

describe('classifyTick', () => {
  it('is active when visible with a recent interaction', () => {
    expect(classifyTick(true, 1000, false)).toBe('active')
    expect(classifyTick(true, ACTIVE_WINDOW_MS, true)).toBe('active')
  })
  it('is ambient when visible but idle, or hidden with music open', () => {
    expect(classifyTick(true, ACTIVE_WINDOW_MS + 1, false)).toBe('ambient')
    expect(classifyTick(false, 0, true)).toBe('ambient')
  })
  it('does not count a hidden tab without music', () => {
    expect(classifyTick(false, 0, false)).toBeNull()
  })
})

describe('addTime', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as unknown as Storage
  })

  it('accumulates per bucket for today', () => {
    addTime('active', 5)
    addTime('active', 5)
    addTime('ambient', 5)
    expect(JSON.parse(store.get('dpnr.timeOnDpnr')!)).toEqual({ date: localDay(), activeSeconds: 10, ambientSeconds: 5 })
  })

  it('starts a new day from zero', () => {
    store.set('dpnr.timeOnDpnr', JSON.stringify({ date: '2000-01-01', activeSeconds: 999, ambientSeconds: 999 }))
    addTime('ambient', 5)
    expect(JSON.parse(store.get('dpnr.timeOnDpnr')!)).toEqual({ date: localDay(), activeSeconds: 0, ambientSeconds: 5 })
  })
})
