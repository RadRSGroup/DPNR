import { describe, it, expect } from 'vitest'
import { confirmedThisMonth } from '@dpnr/shared-types'

/** Growth Tracker's lists and dashboard/handler.ts's counts share this window. */
describe('confirmedThisMonth', () => {
  const now = new Date('2026-09-29T12:00:00.000Z')

  it('keeps confirmed signals created this UTC month, from the 1st on', () => {
    const signals = [
      { id: 'a', status: 'confirmed', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'b', status: 'confirmed', createdAt: '2026-09-29T08:00:00.000Z' },
      { id: 'c', status: 'confirmed', createdAt: '2026-08-31T23:59:59.000Z' },
    ]
    expect(confirmedThisMonth(signals, now).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('leaves out candidates, rejected signals and signals without a date', () => {
    const signals = [
      { id: 'a', status: 'candidate', createdAt: '2026-09-10T00:00:00.000Z' },
      { id: 'b', status: 'rejected', createdAt: '2026-09-10T00:00:00.000Z' },
      { id: 'c', status: 'confirmed' },
    ]
    expect(confirmedThisMonth(signals, now)).toEqual([])
  })
})
