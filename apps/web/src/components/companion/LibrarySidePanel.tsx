'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LibraryTopicDetailResponse } from '@dpnr/shared-types'
import { getLibraryTopic } from '@/lib/api/v1-client'

interface Props {
  slug: string
  sourceSessionId?: string | null
  onClose: () => void
}

const ROOM_LABEL: Record<'mirror' | 'decision', string> = {
  mirror: 'Explore in Mirror Room',
  decision: 'Explore in Decision Room',
}

/**
 * Intelligence Spec §18/§20 "Side Panel" depth — the middle rung of the
 * ladder between DirectiveCard's inline Quick Learn and the full
 * `/library/[slug]` page. Deliberately NOT a route change (no navigation
 * happens opening or closing this) — that's what makes "return with context
 * preserved" (§18's own flow diagram) true by construction: the Companion
 * page's chat state underneath is untouched React state, never unmounted.
 *
 * A `fixed inset-0` backdrop (same click-to-dismiss precedent as
 * CreditsExhaustedModal.tsx) catches outside clicks, but the panel itself is
 * a bounded, edge-anchored box — a right-side drawer on desktop, a bottom
 * sheet on mobile — not a full-screen block, since this is meant to sit
 * beside an active conversation, not replace it.
 *
 * Renders the same 5 spec §20 sections `LibraryTopicPage` shows on the full
 * page, from the identical canonical `LibraryTopicDetailResponse` object —
 * "same object, many surfaces" holds because both surfaces read the exact
 * same fields, never a separately-generated summary. Any section a topic
 * hasn't been authored with yet renders nothing rather than a fabricated
 * placeholder — see LibraryTopicVersionItemSchema's own doc comment.
 */
export default function LibrarySidePanel({ slug, sourceSessionId, onClose }: Props) {
  const router = useRouter()
  const [topic, setTopic] = useState<LibraryTopicDetailResponse | null>(null)
  const [error, setError] = useState(false)

  // `slug` doesn't change across this component's lifetime in practice
  // (DirectiveCard mounts one panel per fixed topic) — no reset-on-change
  // logic needed, just the initial fetch.
  useEffect(() => {
    let ignore = false
    getLibraryTopic(slug)
      .then((t) => { if (!ignore) setTopic(t) })
      .catch(() => { if (!ignore) setError(true) })
    return () => { ignore = true }
  }, [slug])

  function exploreInRoom(room: 'mirror' | 'decision') {
    const params = new URLSearchParams({ topic: slug })
    if (topic?.title) params.set('topicTitle', topic.title)
    if (sourceSessionId) params.set('sourceSessionId', sourceSessionId)
    router.push(`/${room}/new?${params.toString()}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] sm:h-full max-h-[85vh] sm:max-h-none bg-[#130d1f] border-t sm:border-t-0 sm:border-l border-purple-700/40 rounded-t-3xl sm:rounded-none overflow-y-auto">
        <div className="sticky top-0 bg-[#130d1f]/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <p className="text-purple-300/70 text-xs uppercase tracking-wide">From the Library</p>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 text-sm" aria-label="Close">✕</button>
        </div>

        <div className="px-5 py-5 space-y-6">
          {!topic && !error && <p className="text-white/40 text-sm text-center py-8">Loading…</p>}
          {error && <p className="text-red-400/80 text-sm text-center py-8">Couldn&apos;t load this topic.</p>}

          {topic && (
            <>
              <h2 className="font-display text-xl text-white">{topic.title}</h2>

              <Section title="Understand">
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{topic.body}</p>
              </Section>

              {topic.personalizedExplanation && (
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
                  <p className="text-purple-300/70 text-xs uppercase tracking-wide mb-1">For you</p>
                  <p className="text-white/70 text-sm leading-relaxed">{topic.personalizedExplanation}</p>
                </div>
              )}

              {topic.howItMayShowUp && topic.howItMayShowUp.length > 0 && (
                <Section title="Recognize — how it may show up">
                  <BulletList items={topic.howItMayShowUp} />
                </Section>
              )}

              {topic.possibleRoots && topic.possibleRoots.length > 0 && (
                <Section title="Possible roots — what may be underneath">
                  <p className="text-white/40 text-xs mb-2">Possibilities to consider, not a diagnosis — only one might fit, or none.</p>
                  <BulletList items={topic.possibleRoots} />
                </Section>
              )}

              {topic.reflectionQuestions && topic.reflectionQuestions.length > 0 && (
                <Section title="Personal reflection">
                  <BulletList items={topic.reflectionQuestions} />
                </Section>
              )}

              {topic.waysToWorkWithIt && topic.waysToWorkWithIt.length > 0 && (
                <Section title="Work with it">
                  <BulletList items={topic.waysToWorkWithIt} />
                </Section>
              )}

              <div className="pt-2 space-y-2">
                {(topic.recommendedRooms ?? []).map((room) => (
                  <button
                    key={room}
                    onClick={() => exploreInRoom(room)}
                    className="w-full text-left bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 rounded-2xl px-4 py-3 transition-colors"
                  >
                    <p className="text-purple-200 text-sm font-medium">{ROOM_LABEL[room]}</p>
                    <p className="text-purple-300/60 text-xs mt-0.5">Tap to open →</p>
                  </button>
                ))}
                <Link
                  href={`/library/${slug}`}
                  className="block w-full text-center text-white/40 hover:text-white/60 text-xs underline py-2"
                >
                  View full topic
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-white/50 text-xs uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-white/70 text-sm leading-relaxed flex gap-2">
          <span className="text-purple-400/60 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
