import { beforeEach, describe, expect, it } from 'vitest'
import { claimFreshMainChat, touchVisit, VISIT_GAP_MS } from './visit'

// Node has no localStorage; a Map-backed stand-in is enough for these rules.
beforeEach(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

describe('visits', () => {
  it('starts a visit on first sight and keeps it while active', () => {
    const t0 = 1_000_000
    const first = touchVisit(t0)
    expect(first.isNew).toBe(true)
    const later = touchVisit(t0 + VISIT_GAP_MS - 1)
    expect(later).toEqual({ id: first.id, isNew: false })
    // Activity slides the window: still the same visit a full gap after the last touch.
    expect(touchVisit(t0 + 2 * VISIT_GAP_MS - 2).isNew).toBe(false)
  })

  it('starts a new visit after the gap', () => {
    const t0 = 1_000_000
    const first = touchVisit(t0)
    const next = touchVisit(t0 + VISIT_GAP_MS)
    expect(next.isNew).toBe(true)
    expect(next.id).not.toBe(first.id)
  })

  it('gives Main Chat one fresh start per visit', () => {
    expect(claimFreshMainChat()).toBe(true)
    expect(claimFreshMainChat()).toBe(false)
  })

  it('never redirects or starts fresh when storage is blocked', () => {
    globalThis.localStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    } as unknown as Storage
    expect(touchVisit().isNew).toBe(false)
    expect(claimFreshMainChat()).toBe(false)
  })
})
