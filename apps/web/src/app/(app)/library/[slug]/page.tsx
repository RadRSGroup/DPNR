'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopic } from '@/lib/api/v1-client'
import type { LibraryTopicDetailResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

const ROOM_LABEL: Record<'mirror' | 'decision' | 'companion', string> = {
  mirror: 'Explore in Mirror Room',
  decision: 'Explore in Decision Room',
  companion: 'Talk it through in Main Chat',
}

/**
 * Topic detail — reads the same canonical `LibraryTopicDetailResponse`
 * `DirectiveCard`/`LibrarySidePanel` read, and renders the same Intelligence
 * Spec §20 sections `LibrarySidePanel` shows in Main Chat's Side Panel —
 * "same object, many surfaces" (§18) means this page and the Side Panel must
 * never show different content for the same topic. A topic missing any
 * section (authored before this session, or never given full content)
 * simply omits that section rather than fabricating or hiding it.
 */
export default function LibraryTopicPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const [topic, setTopic] = useState<LibraryTopicDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }

        const data = await getLibraryTopic(params.slug)
        setTopic(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, params.slug])

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/library-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pb-10 pt-14 lg:pt-8">
        <Link href="/library" className="inline-flex items-center gap-1.5 text-[var(--color-text-tertiary)] hover:text-white/60 text-xs mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Content & Learning
        </Link>

        {loading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">Loading…</p>}
        {!loading && error && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">Couldn&apos;t load this topic.</p>}

        {!loading && topic && (
          <div className="space-y-4">
            <div>
              <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">
                {topic.exploreTheme}{topic.level ? ` · ${topic.level}` : ''}
              </p>
              <h1 className="font-display text-xl lg:text-2xl text-white">{topic.title}</h1>
            </div>

            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{topic.body}</p>

            {topic.expandTheLens && (
              <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{topic.expandTheLens}</p>
            )}

            {topic.personalizedExplanation && (
              <Card className="bg-[var(--color-violet-900)]/20 border-[var(--color-violet-600)]/30">
                <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-wide mb-1">For you</p>
                <p className="text-white/70 text-sm leading-relaxed">{topic.personalizedExplanation}</p>
              </Card>
            )}

            {topic.howItMayShowUp && topic.howItMayShowUp.length > 0 && (
              <TopicSection title="Recognize — how it may show up" items={topic.howItMayShowUp} />
            )}

            {topic.possibleRoots && topic.possibleRoots.length > 0 && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wide mb-1">Possible roots — what may be underneath</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mb-2">Possibilities to consider, not a diagnosis — only one might fit, or none.</p>
                <BulletList items={topic.possibleRoots} />
              </div>
            )}

            {topic.reflectionQuestions && topic.reflectionQuestions.length > 0 && (
              <TopicSection title="Personal reflection" items={topic.reflectionQuestions} />
            )}

            {topic.waysToWorkWithIt && topic.waysToWorkWithIt.length > 0 && (
              <TopicSection title="Work with it" items={topic.waysToWorkWithIt} />
            )}

            {topic.relatedTopics && topic.relatedTopics.length > 0 && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wide mb-2">Related topics</p>
                <div className="flex flex-wrap gap-2">
                  {topic.relatedTopics.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/library/${related.slug}`}
                      className="text-xs text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/30 border border-[var(--color-violet-700)]/40 hover:bg-[var(--color-violet-900)]/50 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {related.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {topic.recommendedRooms && topic.recommendedRooms.length > 0 && (
              <div className="pt-2 space-y-2">
                {topic.recommendedRooms.map((room) => (
                  <button
                    key={room}
                    onClick={() => router.push(
                      // Companion has no deep-link/prefill query params to
                      // consume yet (checked before wiring this) — routes
                      // there plain rather than to a `/companion/new` path
                      // that doesn't exist for this non-session-based room.
                      room === 'companion'
                        ? '/companion'
                        : `/${room}/new?topic=${encodeURIComponent(params.slug)}&topicTitle=${encodeURIComponent(topic.title)}`
                    )}
                    className="w-full text-left bg-[var(--color-violet-600)]/20 border border-[var(--color-violet-500)]/40 hover:bg-[var(--color-violet-600)]/30 rounded-2xl px-4 py-3 transition-colors"
                  >
                    <p className="text-[var(--color-violet-200)] text-sm font-medium">{ROOM_LABEL[room]}</p>
                    <p className="text-[var(--color-violet-300)]/60 text-xs mt-0.5">Tap to open →</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TopicSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-white/50 text-xs uppercase tracking-wide mb-2">{title}</p>
      <BulletList items={items} />
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-white/70 text-sm leading-relaxed flex gap-2">
          <span className="text-[var(--color-violet-400)]/60 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
