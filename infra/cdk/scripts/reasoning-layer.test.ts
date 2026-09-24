import { describe, expect, it } from 'vitest'
import { DOMAINS } from './seed-prompt-registry'
import { applyReasoningLayer, REASONING_LAYER_BLOCKS, REASONING_LAYER_TARGETS } from './reasoning-layer'

const allPrompts = DOMAINS.flatMap(({ domain, seeds }) => seeds.map((seed) => ({ key: `${domain}/${seed.name}`, domain, seed })))
const byKey = new Map(allPrompts.map((p) => [p.key, p]))

describe('shared reasoning layer', () => {
  it('only targets prompts that actually exist in the registry seed', () => {
    for (const key of Object.keys(REASONING_LAYER_TARGETS)) {
      expect(byKey.has(key), `${key} is not a seeded prompt`).toBe(true)
    }
  })

  it('never introduces a template variable (fillTemplate throws on unknown vars)', () => {
    for (const block of Object.values(REASONING_LAYER_BLOCKS)) {
      expect(block).not.toMatch(/\{\{/)
    }
  })

  it('appends the right block to targeted prompts and keeps the original text intact', () => {
    for (const [key, tier] of Object.entries(REASONING_LAYER_TARGETS)) {
      const { domain, seed } = byKey.get(key)!
      const applied = applyReasoningLayer(domain, seed)
      expect(applied.systemTemplate.startsWith(seed.systemTemplate)).toBe(true)
      expect(applied.systemTemplate.endsWith(REASONING_LAYER_BLOCKS[tier])).toBe(true)
      expect(applied.userTemplate).toBe(seed.userTemplate)
      expect(applied.variables).toEqual(seed.variables)
      expect(applied.outputSchema).toEqual(seed.outputSchema)
    }
  })

  it('leaves every untargeted prompt byte-identical', () => {
    for (const { key, domain, seed } of allPrompts) {
      if (key in REASONING_LAYER_TARGETS) continue
      expect(applyReasoningLayer(domain, seed)).toBe(seed)
    }
  })

  it('never touches safety prompts, classifiers or Twin extraction', () => {
    const protectedKeys = allPrompts
      .map((p) => p.key)
      .filter((k) => k.startsWith('safety/') || k.startsWith('twin/') || k.includes('/classify_'))
    expect(protectedKeys.length).toBeGreaterThan(0)
    for (const key of protectedKeys) {
      expect(REASONING_LAYER_TARGETS[key]).toBeUndefined()
    }
  })
})
