'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentSession } from '@/lib/cognito/client'
import { getLibraryTopics } from '@/lib/api/v1-client'
import type { LibraryTopicSummary } from '@dpnr/shared-types'

/**
 * Content Library's first real frontend — the catalog (GET /v1/library/topics)
 * has been real and live-seeded since Session 3; Companion's inline
 * `DirectiveCard` topic expansion was always a stopgap for not having this
 * page. Deliberately a plain list, same "don't overbuild the UI ahead of
 * the data" discipline as the Digital Twin ("InnerSelf") page.
 */
export default function LibraryPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<LibraryTopicSummary[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const data = await getLibraryTopics()
        setTopics(data.topics)
      } catch {
        // Degrades to an empty state — same tolerance every other page here uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const byCategory = topics?.reduce<Record<string, LibraryTopicSummary[]>>((acc, t) => {
    ;(acc[t.taxonomyCategory] ??= []).push(t)
    return acc
  }, {})

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <h1 className="text-white text-xl font-light">Library</h1>
        </div>
        <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-xs underline">
          InnerOS
        </Link>
      </div>

      {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}

      {!loading && topics?.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/30 text-sm">Nothing in the Library yet.</p>
        </div>
      )}

      {!loading && byCategory && Object.entries(byCategory).map(([category, items]) => (
        <div key={category} className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-2">{category}</p>
          <div className="space-y-2">
            {items.map((topic) => (
              <Link
                key={topic.slug}
                href={`/library/${topic.slug}`}
                className="flex items-center justify-between w-full bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl px-4 py-3 transition-all"
              >
                <p className="text-white text-sm">{topic.title}</p>
                <span className="text-white/30 text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
