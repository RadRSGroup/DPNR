'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import { getDecisionFull, ApiError } from '@/lib/api/v1-client'
import type { DecisionRoomFullResponse, DecisionRoomOptionView, TagType } from '@dpnr/shared-types'

/**
 * Decision Room's post-completion review page — was Supabase-only
 * (`supabase.from('decisions')`), which meant it could never show a
 * decision made through the real Cognito-backed `/v1/rooms` flow (that
 * flow never wrote to Supabase at all — see docs/AGENT_LOG.md Session 7
 * part 4). Ported onto the real `GET /v1/rooms/decision/{id}/full` read,
 * same session-ticket/design-token pattern every other real page here uses.
 *
 * Deliberately read-only, unlike the old Supabase-backed page. The legacy
 * version let you edit tags/projections, ask the AI to re-suggest them,
 * add check-ins, mark an outcome, edit the review date, and delete the
 * decision outright — none of those have a real `/v1` write endpoint today
 * (decision-full.ts is a read; there's no PATCH/DELETE for a decision, no
 * add-outcome or replace-tags endpoint). Rather than fake write buttons
 * against nothing real, this page only shows what's actually stored —
 * the same "don't fabricate" call every other page here already makes
 * for its own dropped widgets. A future session can restore
 * editing/outcome-tracking once real write endpoints exist for it.
 */

const TAG_LABEL: Record<TagType, string> = {
  pro: 'Pros',
  con: 'Cons',
  desire: 'Desires',
  fear: 'Fears',
  value: 'Values',
  need: 'Needs',
}

const TAG_COLOR: Record<TagType, string> = {
  pro: 'text-emerald-400 border-emerald-700/40 bg-emerald-900/20',
  con: 'text-red-300 border-red-700/40 bg-red-900/20',
  desire: 'text-[var(--color-violet-300)] border-[var(--color-violet-600)]/40 bg-[var(--color-violet-900)]/20',
  fear: 'text-orange-300 border-orange-700/40 bg-orange-900/20',
  value: 'text-blue-300 border-blue-700/40 bg-blue-900/20',
  need: 'text-indigo-300 border-indigo-700/40 bg-indigo-900/20',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OptionSection({ option }: { option: DecisionRoomOptionView }) {
  const tagsByType = (type: TagType) => option.tags.filter((t) => t.tagType === type)
  const groups: TagType[] = ['pro', 'con', 'desire', 'fear', 'value', 'need']
  const selectedProjections = option.projections.filter((p) => p.selected)

  return (
    <Card>
      <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-1">Option {option.label}</p>
      <p className="text-white/80 text-sm leading-relaxed mb-4">{option.content}</p>

      <div className="space-y-3">
        {groups.map((type) => {
          const tags = tagsByType(type)
          if (tags.length === 0) return null
          return (
            <div key={type}>
              <p className="text-white/30 text-xs uppercase tracking-wide mb-1.5">{TAG_LABEL[type]}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className={`text-xs border rounded-full px-2.5 py-1 ${TAG_COLOR[type]}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedProjections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border-glass)]">
          <p className="text-white/30 text-xs uppercase tracking-wide mb-1.5">Future projections</p>
          <div className="space-y-1.5">
            {selectedProjections.map((p, i) => (
              <p key={i} className="text-white/60 text-sm leading-relaxed">
                &ldquo;{p.statement}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [decision, setDecision] = useState<DecisionRoomFullResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getDecisionFull(id)
        setDecision(data)
      } catch (err) {
        if (err instanceof ApiError && err.code === 'decision_not_found') {
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
            <Link href="/decision/new" className="text-[var(--color-violet-400)] text-sm">
              ← Decision Room
            </Link>

            {loading && <p className="text-white/30 text-sm text-center pt-12">Loading…</p>}

            {!loading && notFound && (
              <div className="pt-12 text-center">
                <p className="text-white/50">Decision not found.</p>
              </div>
            )}

            {!loading && decision && (
              <div className="mt-5 space-y-4">
                <div>
                  <p
                    className={`text-xs uppercase tracking-widest ${
                      decision.status === 'completed' ? 'text-emerald-400' : 'text-[var(--color-violet-400)]'
                    }`}
                  >
                    {decision.status === 'completed' ? '✓ Completed' : `Step ${decision.currentStep}/7 in progress`}
                    {' · '}
                    {formatDate(decision.createdAt)}
                  </p>
                  <h1 className="font-display text-xl lg:text-2xl text-white mt-1">{decision.title}</h1>
                  {decision.subtitle && <p className="text-white/40 text-sm italic mt-1">{decision.subtitle}</p>}
                </div>

                {decision.status !== 'completed' && (
                  <Link
                    href={`/decision/new?resume=${decision.decisionId}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-4 py-2 text-sm text-white transition-colors"
                  >
                    Continue →
                  </Link>
                )}

                {decision.narrative && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Your story</p>
                    <p className="text-white/70 text-sm leading-relaxed">{decision.narrative}</p>
                  </Card>
                )}

                {decision.options.map((option) => (
                  <OptionSection key={option.label} option={option} />
                ))}

                {decision.emotion && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Body &amp; emotion</p>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {decision.emotion.bodyLocation && (
                        <span className="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/60">
                          {decision.emotion.bodyLocation}
                        </span>
                      )}
                      {decision.emotion.emotionColor && (
                        <span className="text-xs bg-white/10 rounded-full px-2.5 py-1 text-white/60">
                          {decision.emotion.emotionColor}
                        </span>
                      )}
                    </div>
                    {decision.emotion.aiReflection && (
                      <p className="text-white/50 text-sm italic leading-relaxed">&ldquo;{decision.emotion.aiReflection}&rdquo;</p>
                    )}
                  </Card>
                )}

                {decision.outcomes.length > 0 && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">What happened</p>
                    <div className="space-y-3">
                      {decision.outcomes.map((o, i) => (
                        <div key={i} className="space-y-0.5">
                          {o.chosenOptionLabel && <p className="text-white/30 text-xs">Chose Option {o.chosenOptionLabel}</p>}
                          {o.reflection && <p className="text-white/70 text-sm leading-relaxed">{o.reflection}</p>}
                          <p className="text-white/25 text-xs">{formatDate(o.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {decision.summary && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Summary</p>
                    <p className="text-white/70 text-sm leading-relaxed">{decision.summary}</p>
                  </Card>
                )}

                {decision.reviewDate && (
                  <Card>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Check-in date</p>
                    <p className="text-white/60 text-sm">{formatDate(decision.reviewDate)}</p>
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
