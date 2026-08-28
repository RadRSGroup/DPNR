'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Layers, Heart, Target, Compass, BookOpen, ArrowRight } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopics, getLibraryRecommendations } from '@/lib/api/v1-client'
import type { LibraryTopicSummary, LibraryRecommendationsResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

const CATEGORY_STYLE: Record<string, { icon: typeof BookOpen; from: string; to: string }> = {
  'Patterns & Beliefs': { icon: Layers, from: 'var(--color-violet-600)', to: 'var(--color-violet-900)' },
  'Inner World': { icon: Heart, from: 'var(--color-magenta-500)', to: 'var(--color-violet-900)' },
  'Values & Needs': { icon: Target, from: 'var(--color-amber-400)', to: 'var(--color-violet-900)' },
  'Direction & Creation': { icon: Compass, from: 'var(--color-violet-500)', to: 'var(--color-violet-950)' },
}
const DEFAULT_STYLE = { icon: BookOpen, from: 'var(--color-violet-500)', to: 'var(--color-violet-900)' }

/**
 * Content & Learning's hub — reskinned against the reference screen (Session
 * 20/21, Phase 3), but only using the real catalog (`GET /v1/library/topics`
 * — title/slug/category, no body excerpt, no format/duration metadata, no
 * cover art per topic) plus a real client-side title search over it. The
 * reference's own hero carousel and "Recommended for You" copy imply content
 * and personalization that don't exist: there are only 6 real seeded topics
 * total (no "Audio/7 min"-style metadata was ever authored for any of
 * them — infra/cdk/scripts/library-topics.seed.ts), and `GET
 * /v1/library/recommendations` (Slice 3) now returns a real ranking derived
 * from the caller's confirmed Twin signals — see that Lambda's own doc
 * comment for the domain-to-taxonomyCategory mapping it uses. This page
 * already called that endpoint and rendered the section only when
 * non-empty, so no frontend change was needed to pick up real results. The
 * hero card rotates through the real catalog by day-of-year (Slice 3 — was
 * pinned to whatever `topics[0]` happened to be, i.e. arbitrary Scan
 * order, not a real "featured" choice) instead of invented carousel copy;
 * the four category
 * groups below are real topics/categories; card art is a per-category
 * gradient + icon (decorative, not per-topic fabrication) rather than
 * invented photography.
 */
export default function LibraryPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<LibraryTopicSummary[] | null>(null)
  const [recommendations, setRecommendations] = useState<LibraryRecommendationsResponse['recommendations']>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

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

  const byCategory = filtered?.reduce<Record<string, LibraryTopicSummary[]>>((acc, t) => {
    ;(acc[t.taxonomyCategory] ??= []).push(t)
    return acc
  }, {})

  // Rotate through the real catalog by day-of-year rather than pinning to
  // topics[0] (arbitrary Scan order — see the file doc comment above) or
  // inventing curated "featured" metadata that doesn't exist. Sort by slug
  // first for a stable order, so the rotation is deterministic day to day
  // rather than shuffling on every Scan.
  function pickFeatured(list: LibraryTopicSummary[] | null): LibraryTopicSummary | undefined {
    if (!list || list.length === 0) return undefined
    const sorted = [...list].sort((a, b) => a.slug.localeCompare(b.slug))
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 0).getTime()
    const dayOfYear = Math.floor((now.getTime() - startOfYear) / 86_400_000)
    return sorted[dayOfYear % sorted.length]
  }
  const featured = pickFeatured(topics)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 lg:flex lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-white">Content & Learning</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Curated for your journey. Learn, reflect, and grow at your own pace.
            </p>
          </div>
          <div className="relative mt-4 lg:mt-0 lg:w-72">
            <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics..."
              className="w-full bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors"
            />
          </div>
        </div>

        {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}

        {!loading && topics?.length === 0 && (
          <Card>
            <p className="text-white/30 text-sm">Nothing in the Library yet.</p>
          </Card>
        )}

        {!loading && featured && !query && (
          <Link href={`/library/${featured.slug}`} className="block mb-6">
            <Card className="!p-0 overflow-hidden lg:flex lg:items-center">
              <div
                className="h-32 lg:h-40 lg:w-56 lg:shrink-0 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${(CATEGORY_STYLE[featured.taxonomyCategory] ?? DEFAULT_STYLE).from}, ${(CATEGORY_STYLE[featured.taxonomyCategory] ?? DEFAULT_STYLE).to})` }}
              >
                {(() => {
                  const Icon = (CATEGORY_STYLE[featured.taxonomyCategory] ?? DEFAULT_STYLE).icon
                  return <Icon className="w-10 h-10 text-white/70" />
                })()}
              </div>
              <div className="p-5 flex-1 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">Featured Today</p>
                  <p className="text-white text-base font-medium">{featured.title}</p>
                  <p className="text-white/40 text-xs mt-1">{featured.taxonomyCategory}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
              </div>
            </Card>
          </Link>
        )}

        {!loading && recommendations.length > 0 && (
          <div className="mb-6">
            <p className="text-white text-sm mb-3">Recommended for You</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {recommendations.map(({ topic, reason }) => (
                <Link key={topic.slug} href={`/library/${topic.slug}`}>
                  <Card className="h-full hover:border-white/20 transition-colors">
                    <p className="text-white text-sm">{topic.title}</p>
                    <p className="text-white/40 text-xs mt-1">{reason}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && byCategory && Object.entries(byCategory).map(([category, items]) => {
          const style = CATEGORY_STYLE[category] ?? DEFAULT_STYLE
          const Icon = style.icon
          return (
            <div key={category} className="mb-6">
              <p className="text-white text-sm mb-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-[var(--color-violet-400)]" />
                {category}
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {items.map((topic) => (
                  <Link key={topic.slug} href={`/library/${topic.slug}`}>
                    <Card className="h-full hover:border-white/20 active:scale-[0.98] transition-all">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
                        style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                      >
                        <Icon className="w-4 h-4 text-white/80" />
                      </div>
                      <p className="text-white text-sm leading-snug">{topic.title}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        {!loading && filtered?.length === 0 && topics && topics.length > 0 && (
          <p className="text-white/30 text-sm text-center pt-8">No topics match &ldquo;{query}&rdquo;.</p>
        )}
      </div>
    </div>
  )
}
