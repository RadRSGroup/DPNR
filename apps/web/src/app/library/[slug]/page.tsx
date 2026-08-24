'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopic } from '@/lib/api/v1-client'
import type { LibraryTopicDetailResponse } from '@dpnr/shared-types'

/** Topic detail — same body/personalizedExplanation rendering as Companion's inline `DirectiveCard`, as a real page. */
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
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
        <Link href="/library" className="text-purple-400 hover:text-purple-300 text-xs underline">
          Library
        </Link>
      </div>

      {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}
      {!loading && error && <p className="text-white/30 text-sm text-center pt-8">Couldn&apos;t load this topic.</p>}

      {!loading && topic && (
        <div className="space-y-4">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-1">{topic.taxonomyCategory}</p>
            <h1 className="text-white text-xl font-light">{topic.title}</h1>
          </div>

          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{topic.body}</p>

          {topic.personalizedExplanation && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl p-4">
              <p className="text-purple-300/70 text-xs uppercase tracking-wide mb-1">For you</p>
              <p className="text-white/70 text-sm leading-relaxed">{topic.personalizedExplanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
