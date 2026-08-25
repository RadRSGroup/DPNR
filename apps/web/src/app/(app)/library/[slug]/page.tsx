'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopic } from '@/lib/api/v1-client'
import type { LibraryTopicDetailResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

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
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pb-10 pt-14 lg:pt-8">
        <Link href="/library" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/60 text-xs mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Content & Learning
        </Link>

        {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}
        {!loading && error && <p className="text-white/30 text-sm text-center pt-8">Couldn&apos;t load this topic.</p>}

        {!loading && topic && (
          <div className="space-y-4">
            <div>
              <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">{topic.taxonomyCategory}</p>
              <h1 className="font-display text-xl lg:text-2xl text-white">{topic.title}</h1>
            </div>

            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{topic.body}</p>

            {topic.personalizedExplanation && (
              <Card className="bg-[var(--color-violet-900)]/20 border-[var(--color-violet-600)]/30">
                <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-wide mb-1">For you</p>
                <p className="text-white/70 text-sm leading-relaxed">{topic.personalizedExplanation}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
