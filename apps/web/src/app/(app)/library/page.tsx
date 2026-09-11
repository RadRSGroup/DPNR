'use client'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopics, getLibraryRecommendations } from '@/lib/api/v1-client'
import type { LibraryTopicSummary, LibraryRecommendationsResponse, ExploreTheme } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import { THEME_META, THEME_ORDER } from '@/lib/library/theme-meta'

/**
 * Named homepage shelves (Content Library Master Architecture v2, Part I §2)
 * mapped onto the one Explore Theme each is closest to. Doc names 11 shelves
 * total; FOR YOU and START HERE are built separately below (personalized /
 * fixed-list, not theme-filtered), and CONTINUE EXPLORING + WHAT YOU'RE
 * NAVIGATING NOW are deliberately not built this pass — both need real
 * interaction-history tracking ("Track opened, completed, saved, discussed,
 * and revisited topics", Part I §11) that doesn't exist anywhere in this
 * codebase yet; a shelf that always renders empty would be a worse honest-
 * empty-state violation than simply not showing it. NEED/CHOOSE/REPAIR don't
 * get a dedicated named shelf (the doc's own 11 don't name one for them
 * either) but stay fully reachable via the Explore by Theme row below, so
 * nothing in the catalog is stranded.
 */
const NAMED_SHELVES: { title: string; theme: ExploreTheme }[] = [
  { title: 'Know Yourself', theme: 'ME' },
  { title: 'Patterns Worth Noticing', theme: 'PATTERNS' },
  { title: 'Relationships', theme: 'RELATE' },
  { title: 'Emotional World', theme: 'FEEL' },
  { title: 'Work & Money', theme: 'CREATE' },
  { title: 'Body & Energy', theme: 'BODY' },
  { title: 'Meaning & Life', theme: 'LIFE' },
]

/**
 * Part I §2's own "Start Here" line: "Foundational topics that give new
 * users useful language quickly: Needs, Values, Boundaries, Emotions,
 * Patterns, Self-Trust, Attachment, Regulation." None of those 8 words are
 * exact topic titles, so each is resolved to the closest real Foundation-
 * level topic below — a judgment call, not a literal lookup (flagged here
 * rather than silently guessed).
 */
const START_HERE_TITLES = [
  'Needs vs. Neediness', 'Values', 'Boundaries', 'Emotion vs. Reaction',
  'Avoidance', 'Self-Trust', 'Attachment Styles - Overview', 'Emotional Regulation',
]

function TopicCard({ topic, subtitle }: { topic: LibraryTopicSummary; subtitle?: string }) {
  const { image, label } = THEME_META[topic.exploreTheme]
  return (
    <Link href={`/library/${topic.slug}`} className="shrink-0 w-40 lg:w-48">
      <Card className="h-full hover:border-white/20 active:scale-[0.98] transition-all">
        <div className="relative w-9 h-9 rounded-full overflow-hidden mb-3 ring-1 ring-white/15">
          <Image src={image} alt={label} fill sizes="36px" className="object-cover" />
        </div>
        <p className="text-white text-sm leading-snug">{topic.title}</p>
        {subtitle && <p className="text-[var(--color-text-tertiary)] text-xs mt-1">{subtitle}</p>}
      </Card>
    </Link>
  )
}

function Shelf({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-white text-sm mb-3">{title}</p>
      <div className="scrollbar-glass flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0">{children}</div>
    </div>
  )
}

/**
 * Content & Learning's hub — redesigned this session against the Content
 * Library Master Architecture v2 (superseding the earlier reskin against the
 * mockup reference alone). That doc's own "Key Architecture Decision" is
 * explicit: "Do not organize the library as one rigid tree... the same topic
 * can belong to several life domains... at the same time" — replaces the
 * old single-`taxonomyCategory` grid with real Netflix-style horizontal
 * shelves keyed off the new many-to-many `exploreTheme`/`lifeDomains` axes
 * (dynamo/global-tables.ts). See NAMED_SHELVES' own doc comment for which of
 * the source doc's 11 named shelves are and aren't built this pass.
 */
export default function LibraryPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<LibraryTopicSummary[] | null>(null)
  const [recommendations, setRecommendations] = useState<LibraryRecommendationsResponse['recommendations']>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [activeTheme, setActiveTheme] = useState<ExploreTheme | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }

        const data = await getLibraryTopics()
        setTopics(data.topics)
        getLibraryRecommendations().then((r) => setRecommendations(r.recommendations)).catch(() => {})
      } catch {
        // Degrades to an empty state — same tolerance every other page here uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const filtered = useMemo(() => {
    if (!topics) return null
    const q = query.trim().toLowerCase()
    return q ? topics.filter((t) => t.title.toLowerCase().includes(q)) : topics
  }, [topics, query])

  const byTheme = useMemo(() => {
    const map = new Map<ExploreTheme, LibraryTopicSummary[]>()
    for (const t of topics ?? []) {
      const list = map.get(t.exploreTheme)
      if (list) list.push(t)
      else map.set(t.exploreTheme, [t])
    }
    return map
  }, [topics])

  const startHere = useMemo(() => {
    if (!topics) return []
    return START_HERE_TITLES.map((title) => topics.find((t) => t.title === title)).filter(
      (t): t is LibraryTopicSummary => t !== undefined
    )
  }, [topics])

  // Rotate through the real catalog by day-of-year rather than pinning to
  // topics[0] (arbitrary Scan order) or inventing curated "featured"
  // metadata that doesn't exist. Sort by slug first for a stable order, so
  // the rotation is deterministic day to day rather than shuffling on every Scan.
  function pickFeatured(list: LibraryTopicSummary[] | null): LibraryTopicSummary | undefined {
    if (!list || list.length === 0) return undefined
    const sorted = [...list].sort((a, b) => a.slug.localeCompare(b.slug))
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0).getTime()
    const dayOfYear = Math.floor((now.getTime() - startOfYear) / 86_400_000)
    return sorted[dayOfYear % sorted.length]
  }
  const featured = pickFeatured(topics)
  const searching = query.trim().length > 0

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/library-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 lg:flex lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-white">Content & Learning</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Curated for your journey. Learn, reflect, and grow at your own pace.
            </p>
          </div>
          <div className="relative mt-4 lg:mt-0 lg:w-72">
            <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveTheme(null) }}
              placeholder="Search topics..."
              className="w-full bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors"
            />
          </div>
        </div>

        {loading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">Loading…</p>}

        {!loading && topics?.length === 0 && (
          <Card>
            <p className="text-[var(--color-text-tertiary)] text-sm">Nothing in the Library yet.</p>
          </Card>
        )}

        {!loading && featured && !searching && (
          <Link href={`/library/${featured.slug}`} className="block mb-6">
            <Card className="relative overflow-hidden !p-0 h-40 lg:h-48">
              <Image src="/images/library/library-hero.webp" alt="" fill sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-[var(--color-bg-base)]/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-start justify-end p-5 lg:p-8">
                <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">Featured Today</p>
                <h2 className="font-display text-xl lg:text-2xl text-white">{featured.title}</h2>
                <div className="flex items-center gap-1.5 mt-1 text-[var(--color-text-tertiary)] text-xs">
                  <span>{THEME_META[featured.exploreTheme].label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Card>
          </Link>
        )}

        {searching ? (
          <>
            {filtered && filtered.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {filtered.map((topic) => <TopicCard key={topic.slug} topic={topic} />)}
              </div>
            )}
            {filtered?.length === 0 && (
              <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">No topics match &ldquo;{query}&rdquo;.</p>
            )}
          </>
        ) : (
          <>
            {!loading && recommendations.length > 0 && (
              <Shelf title="For You">
                {recommendations.map(({ topic, reason }) => (
                  <TopicCard key={topic.slug} topic={topic} subtitle={reason} />
                ))}
              </Shelf>
            )}

            {!loading && startHere.length > 0 && (
              <Shelf title="Start Here">
                {startHere.map((topic) => <TopicCard key={topic.slug} topic={topic} />)}
              </Shelf>
            )}

            {!loading && topics && topics.length > 0 && (
              <div className="mb-6">
                <p className="text-white text-sm mb-3">Explore by Theme</p>
                <div className="flex flex-wrap gap-2">
                  {THEME_ORDER.filter((theme) => byTheme.has(theme)).map((theme) => {
                    const active = activeTheme === theme
                    return (
                      <button
                        key={theme}
                        onClick={() => setActiveTheme(active ? null : theme)}
                        className={`flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 text-xs transition-colors ${
                          active
                            ? 'bg-[var(--color-violet-600)] border border-[var(--color-violet-500)] text-white'
                            : 'liquid-glass text-white/70'
                        }`}
                      >
                        <span className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-white/15">
                          <Image src={THEME_META[theme].image} alt="" fill sizes="24px" className="object-cover" />
                        </span>
                        {THEME_META[theme].label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTheme ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {(byTheme.get(activeTheme) ?? []).map((topic) => <TopicCard key={topic.slug} topic={topic} />)}
              </div>
            ) : (
              NAMED_SHELVES.map(({ title, theme }) => {
                const items = byTheme.get(theme)
                if (!items || items.length === 0) return null
                return (
                  <Shelf key={theme} title={title}>
                    {items.map((topic) => <TopicCard key={topic.slug} topic={topic} />)}
                  </Shelf>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
