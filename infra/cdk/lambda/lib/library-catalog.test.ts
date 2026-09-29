import { describe, it, expect } from 'vitest'
import type { LibraryTopicVersionItem } from '@dpnr/shared-types'
import { localizeTopic } from './library-catalog'
import { LIBRARY_TOPIC_SEEDS_V2 } from '../../scripts/library-topics-v2.seed'
import { LIBRARY_TOPICS_HE } from '../../scripts/library-topics-he.seed'

const item: LibraryTopicVersionItem = {
  pk: 'LIBRARY#TOPIC#anger',
  sk: 'VERSION#1',
  exploreTheme: 'FEEL',
  lifeDomains: ['Relationships & Love'],
  level: 'Foundation',
  title: 'Anger',
  body: 'English body',
  expandTheLens: 'English lens',
  howItMayShowUp: ['English example'],
  reflectionQuestions: ['English question?'],
  status: 'active',
  createdAt: '2026-09-29T00:00:00.000Z',
  he: { title: 'כעס', body: 'גוף בעברית', howItMayShowUp: ['דוגמה'] },
}

describe('localizeTopic', () => {
  it('uses the Hebrew sections in Hebrew and keeps English for sections it lacks', () => {
    const he = localizeTopic(item, 'he')
    expect(he.title).toBe('כעס')
    expect(he.body).toBe('גוף בעברית')
    expect(he.howItMayShowUp).toEqual(['דוגמה'])
    expect(he.expandTheLens).toBe('English lens')
    expect(he.exploreTheme).toBe('FEEL')
  })

  it('leaves English, and topics without Hebrew, unchanged', () => {
    expect(localizeTopic(item, 'en')).toBe(item)
    const { he: _unused, ...noHe } = item
    expect(localizeTopic(noHe, 'he')).toEqual(noHe)
  })
})

describe('LIBRARY_TOPICS_HE', () => {
  it('has Hebrew for every seeded topic, with every section the English has', () => {
    for (const topic of LIBRARY_TOPIC_SEEDS_V2) {
      const he = LIBRARY_TOPICS_HE[topic.slug]
      expect(he, topic.slug).toBeDefined()
      expect(he.title.trim(), topic.slug).not.toBe('')
      expect(he.body.trim(), topic.slug).not.toBe('')
      expect(he.expandTheLens?.trim(), topic.slug).toBeTruthy()
      expect(he.howItMayShowUp?.length, topic.slug).toBeGreaterThan(0)
      expect(he.reflectionQuestions?.length, topic.slug).toBe(1)
      expect(he.waysToWorkWithIt?.length, topic.slug).toBe(1)
      expect(he.goDeeperGuidance?.length, topic.slug).toBe(1)
      // No English left over from extraction (DPNR and digits are fine).
      const all = [he.title, he.body, he.expandTheLens, ...(he.howItMayShowUp ?? []), ...(he.reflectionQuestions ?? []), ...(he.waysToWorkWithIt ?? [])].join(' ')
      expect(all.replace(/DPNR|[XYZ]\b/g, ''), topic.slug).not.toMatch(/[A-Za-z]{2,}/)
    }
    expect(Object.keys(LIBRARY_TOPICS_HE)).toHaveLength(LIBRARY_TOPIC_SEEDS_V2.length)
  })
})
