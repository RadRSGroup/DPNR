'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import { getMirrorFull, ApiError } from '@/lib/api/v1-client'
import type { MirrorRoomFullResponse } from '@dpnr/shared-types'

/**
 * Mirror Room's post-completion review page — didn't exist at all before
 * (unlike Decision Room, which at least had a broken Supabase-only one).
 * Read-only, same reasoning as the ported `decision/[id]/page.tsx`: there's
 * no real write endpoint for a Mirror Room session beyond the step flow
 * itself (no edit/delete/add-note endpoint), so this only shows what
 * `GET /v1/rooms/mirror/{id}/full` actually returns. Field grouping matches
 * the real step map's own grouping (dynamo/mirror-room.ts's doc comment) —
 * not a guess.
 */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-white/30 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white/70 text-sm leading-relaxed">{value}</p>
    </div>
  )
}

export default function MirrorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<MirrorRoomFullResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getMirrorFull(id)
        setSession(data)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else if (err instanceof ApiError && err.status === 401) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

          <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pt-14 lg:pt-8 pb-10 lg:pb-12">
            <Link href="/mirror/new" className="text-[var(--color-violet-400)] text-sm">
              ← Mirror Room
            </Link>

            {loading && <p className="text-white/30 text-sm text-center pt-12">Loading…</p>}

            {!loading && notFound && (
              <div className="pt-12 text-center">
                <p className="text-white/50">Reflection not found.</p>
              </div>
            )}

            {!loading && session && (
              <div className="mt-5 space-y-4">
                <div>
                  <p
                    className={`text-xs uppercase tracking-widest ${
                      session.status === 'completed' ? 'text-emerald-400' : 'text-[var(--color-violet-400)]'
                    }`}
                  >
                    {session.status === 'completed' ? '✓ Completed' : 'In progress'}
                    {' · '}
                    {formatDate(session.createdAt)}
                  </p>
                  <h1 className="font-display text-xl lg:text-2xl text-white mt-1">
                    {session.lifeDomain ? `Reflection — ${session.lifeDomain}` : 'Reflection'}
                  </h1>
                </div>

                {session.status !== 'completed' && (
                  <Link
                    href={`/mirror/new?resume=${session.mirrorId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-4 py-2 text-sm text-white transition-colors"
                  >
                    Continue →
                  </Link>
                )}

                {(session.situation || session.trigger) && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-3">The moment</p>
                    <div className="space-y-3">
                      <Field label="Situation" value={session.situation} />
                      <Field label="Trigger" value={session.trigger} />
                    </div>
                  </Card>
                )}

                {(session.thought || session.emotion || session.bodyResponse || session.automaticReaction) && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-3">In the moment</p>
                    <div className="space-y-3">
                      <Field label="Thought" value={session.thought} />
                      <Field label="Emotion" value={session.emotion} />
                      <Field label="Body response" value={session.bodyResponse} />
                      <Field label="What you did" value={session.automaticReaction} />
                    </div>
                  </Card>
                )}

                {(session.copingResponse || session.recurringPattern) && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-3">The pattern</p>
                    <div className="space-y-3">
                      <Field label="How you tried to cope" value={session.copingResponse} />
                      <Field label="Recurring pattern" value={session.recurringPattern} />
                    </div>
                  </Card>
                )}

                {session.energyMoodEffect && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-3">Life impact</p>
                    <Field label="Effect on energy &amp; mood" value={session.energyMoodEffect} />
                  </Card>
                )}

                {session.commitment && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Commitment</p>
                    <p className="text-white/70 text-sm leading-relaxed">{session.commitment}</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
