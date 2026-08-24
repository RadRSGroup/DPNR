'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanionDirective, LibraryTopicDetailResponse } from '@dpnr/shared-types'
import { getLibraryTopic } from '@/lib/api/v1-client'

interface Props {
  directive: CompanionDirective
}

/**
 * Renders whatever Companion's routing directive suggested, as an
 * actionable card under its chat bubble — never auto-navigates, since the
 * spec frames this as "route contextually," a suggestion the user acts on,
 * not a forced transition (companion/message.ts's own doc comment).
 *
 * `open_library_topic` has nowhere to navigate to yet — there is no Library
 * frontend at all (docs/PHASE_AUDIT.md §4.6 only scoped Dashboard's port
 * this round). Rather than block on building one, this fetches the real
 * topic and expands it inline, the smallest honest way to "surface a
 * Library topic" without inventing a whole Library section.
 */
export default function DirectiveCard({ directive }: Props) {
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
        <p className="text-white/40 text-xs mt-0.5">Tap to open →</p>
      </button>
    )
  }

  return <LibraryTopicCard slug={directive.topicSlug} />
}

function LibraryTopicCard({ slug }: { slug: string }) {
  const [state, setState] = useState<'collapsed' | 'loading' | 'error'>('collapsed')
  const [topic, setTopic] = useState<LibraryTopicDetailResponse | null>(null)

  async function expand() {
    if (topic) { setTopic(null); return } // collapse back
    setState('loading')
    try {
      const detail = await getLibraryTopic(slug)
      setTopic(detail)
      setState('collapsed')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="mt-2 w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3">
      <button onClick={expand} className="w-full text-left flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{topic?.title ?? slug.replace(/-/g, ' ')}</p>
          <p className="text-white/40 text-xs mt-0.5">
            {state === 'loading' ? 'Loading…' : state === 'error' ? 'Couldn\'t load — tap to retry' : topic ? 'Tap to collapse' : 'From the Library · tap to read'}
          </p>
        </div>
        <span className="text-white/30 text-xs">{topic ? '▲' : '▼'}</span>
      </button>
      {topic && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{topic.body}</p>
          {topic.personalizedExplanation && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
              <p className="text-purple-300/70 text-xs uppercase tracking-wide mb-1">For you</p>
              <p className="text-white/70 text-sm leading-relaxed">{topic.personalizedExplanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
