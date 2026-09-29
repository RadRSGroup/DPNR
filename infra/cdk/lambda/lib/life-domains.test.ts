import { describe, it, expect } from 'vitest'
import {
  ACTIVE_DOMAIN_TO_LIFE_DOMAIN,
  LIFE_DOMAIN_IDS,
  LIFE_DOMAIN_LABELS,
  LifeDomainCategorySchema,
  OnboardingSnapshotItemSchema,
} from '@dpnr/shared-types'
import { aggregateLifeDomains } from './signal-aggregates'

describe('Life Domains (spec 8)', () => {
  it('has the spec\'s 8 ids, each labelled', () => {
    expect(LIFE_DOMAIN_IDS).toHaveLength(8)
    for (const id of LIFE_DOMAIN_IDS) expect(LIFE_DOMAIN_LABELS[id]).toBeTruthy()
  })

  it('maps legacy ids on parse', () => {
    expect(LifeDomainCategorySchema.parse('career_purpose')).toBe('work_purpose')
    expect(LifeDomainCategorySchema.parse('creativity_expression')).toBe('work_purpose')
    expect(LifeDomainCategorySchema.parse('spirituality')).toBe('meaning_spirituality')
    expect(LifeDomainCategorySchema.parse('relationships')).toBe('relationships')
  })

  it('still rejects unknown ids', () => {
    expect(LifeDomainCategorySchema.safeParse('hobbies').success).toBe(false)
    expect(LifeDomainCategorySchema.safeParse(3).success).toBe(false)
  })

  it('reads a pre-migration onboarding snapshot', () => {
    const parsed = OnboardingSnapshotItemSchema.shape.activeDomains.parse(['relationships', 'career_purpose'])
    expect(parsed).toEqual(['relationships', 'work_purpose'])
  })

  it('sends onboarding Growth and Fun to their own domains', () => {
    expect(ACTIVE_DOMAIN_TO_LIFE_DOMAIN.Growth).toBe('growth_expansion')
    expect(ACTIVE_DOMAIN_TO_LIFE_DOMAIN.Fun).toBe('home_lifestyle')
    expect(ACTIVE_DOMAIN_TO_LIFE_DOMAIN.Purpose).toBe('work_purpose')
  })

  it('aggregates over the new ids', () => {
    const base = { status: 'confirmed' } as const
    const result = aggregateLifeDomains([
      { ...base, lifeDomain: 'home_lifestyle' },
      { ...base, lifeDomain: 'home_lifestyle' },
      { ...base, lifeDomain: 'growth_expansion' },
      { status: 'candidate', lifeDomain: 'growth_expansion' },
    ] as never)
    expect(result.find((d) => d.domain === 'home_lifestyle')?.percent).toBeGreaterThan(
      result.find((d) => d.domain === 'growth_expansion')?.percent ?? 0,
    )
  })
})
