'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CompanionDirective, LibraryTopicDetailResponse } from '@dpnr/shared-types'
import { getLibraryTopic } from '@/lib/api/v1-client'
import LibrarySidePanel from './LibrarySidePanel'

interface Props {
  directive: CompanionDirective
  /** Companion's own session id, threaded down only for the Side Panel's room-handoff query params. */
  sourceSessionId?: string | null
}

/**
 * Renders whatever Companion's routing directive suggested, as an
 * actionable card under its chat bubble — never auto-navigates, since the
 * spec frames this as "route contextually," a suggestion the user acts on,
 * not a forced transition (companion/message.ts's own doc comment).
 *
 * `open_library_topic`'s depth ladder (Intelligence Spec §18): Quick Learn
 * (this card, auto-loaded, no tap required — "answer without breaking
 * conversation") → Side Panel (`LibrarySidePanel`, structured sections) →
 * the real `/library/[slug]` page. Previously this card duplicated the full
 * topic body inline (written before `/library/[slug]` existed) — now it
 * links to the real page instead, closing the "same object, many surfaces"
 * duplication risk.
 */
export default function DirectiveCard({ directive, sourceSessionId }: Props) {
  const router = useRouter()

  if (directive.kind === 'open_room') {
    const label = directive.roomType === 'decision' ? 'Start a Decision Room' : 'Start a Mirror Room session'
    return (
      <button
        onClick={() => router.push(`/${directive.roomType}/new`)}
        className="mt-2 w-full text-left bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 rounded-2xl px-4 py-3 transition-colors"
      >
        <p className="text-purple-200 text-sm font-medium">{label}</p>
        <p className="text-purple-300/60 text-xs mt-0.5">Tap to open →</p>
      </button>
    )
  }

  if (directive.kind === 'open_dashboard') {
    return (
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-2 w-full text-left bg-white/5 border border-white/15 hover:border-white/30 rounded-2xl px-4 py-3 transition-colors"
      >
        <p className="text-white/80 text-sm font-medium">Open InnerOS</p>
        <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">Tap to open →</p>
      </button>
    )
  }

  return <LibraryTopicCard slug={directive.topicSlug} sourceSessionId={sourceSessionId} />
}

function LibraryTopicCard({ slug, sourceSessionId }: { slug: string; sourceSessionId?: string | null }) {
  const [topic, setTopic] = useState<LibraryTopicDetailResponse | null>(null)
  const [error, setError] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  // Eager, single-item read on mount — "answer without breaking
  // conversation" means the Quick Learn text should just appear, not wait
  // behind a tap (§18's own table: "2-3 sentence definition + optional
  // 'Understand deeper'").
  useEffect(() => {
    let ignore = false
    getLibraryTopic(slug)
      .then((t) => { if (!ignore) setTopic(t) })
      .catch(() => { if (!ignore) setError(true) })
    return () => { ignore = true }
  }, [slug])

  return (
    <>
      <div className="mt-2 w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-white/80 text-sm font-medium">{topic?.title ?? slug.replace(/-/g, ' ')}</p>
        {!topic && !error && <p className="text-[var(--color-text-tertiary)] text-xs">From the Library · loading…</p>}
        {error && <p className="text-[var(--color-text-tertiary)] text-xs">Couldn&apos;t load this topic right now.</p>}
        {topic?.quickDefinition && (
          <p className="text-white/70 text-sm leading-relaxed">{topic.quickDefinition}</p>
        )}
        {topic && (
          <div className="flex items-center gap-4 pt-1">
            <button onClick={() => setPanelOpen(true)} className="text-purple-300 text-xs hover:text-purple-200 transition-colors">
              Understand deeper →
            </button>
            <Link href={`/library/${slug}`} className="text-[var(--color-text-tertiary)] text-xs hover:text-white/60 transition-colors">
              View full topic
            </Link>
          </div>
        )}
      </div>
      {panelOpen && (
        <LibrarySidePanel slug={slug} sourceSessionId={sourceSessionId} onClose={() => setPanelOpen(false)} />
      )}
    </>
  )
}
