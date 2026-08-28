'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Sparkles, Layers, Waves, Heart, Users, Briefcase, Activity, Wallet, Palette, Flower2 } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getDashboard, getDecisionsList, getCompanionContext } from '@/lib/api/v1-client'
import type { DashboardResponse, DecisionsListResponse, CompanionContextResponse, LifeDomainCategory } from '@dpnr/shared-types'
import { LIFE_DOMAIN_LABELS, ARCHETYPE_LABELS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'

/**
 * Growth Tracker (Slice 4 of the 6-slice reference-mockup parity plan,
 * `docs/AGENT_LOG.md`/`C:\Users\rekkawi\.claude\plans\mellow-questing-milner.md`)
 * — "a snapshot of your journey across all areas of life." Every real widget
 * here reuses data already computed for Dashboard (`GET /v1/dashboard`:
 * alignmentScore, lifeDomains, archetypes, roadmap, and this slice's two new
 * fields insightsGained/patternsShifting) or another already-real endpoint
 * (`GET /v1/rooms/decisions`, `GET /v1/companion/context`'s dailyCard) — no
 * new backend beyond the two small monthly-count fields dashboard/handler.ts
 * now also returns (computed from the twinSignals query it already made).
 *
 * Core Pillars and Emotional Landscape are the reference's two concepts with
 * zero real backing anywhere in this codebase (no pillar-alignment scoring
 * model, no sentiment/emotion-tracking pipeline exists). Per this project's
 * "honest where not cheap" decision for Slice 4, these render as plain
 * "not enough signal yet" cards rather than an invented 5-dimension score or
 * sentiment trend — that is deliberate, not a bug or a gap for a future
 * session to quietly "complete" with fabricated numbers.
 */

const DOMAIN_META: Record<LifeDomainCategory, { icon: typeof Heart; color: string; ringClass: string }> = {
  self_inner_world: { icon: Heart, color: 'var(--color-magenta-500)', ringClass: 'stroke-[var(--color-magenta-500)]' },
  relationships: { icon: Users, color: 'var(--color-violet-400)', ringClass: 'stroke-[var(--color-violet-400)]' },
  career_purpose: { icon: Briefcase, color: 'var(--color-violet-500)', ringClass: 'stroke-[var(--color-violet-500)]' },
  health_body: { icon: Activity, color: 'var(--color-amber-400)', ringClass: 'stroke-[var(--color-amber-400)]' },
  money_abundance: { icon: Wallet, color: 'var(--color-amber-300)', ringClass: 'stroke-[var(--color-amber-300)]' },
  creativity_expression: { icon: Palette, color: 'var(--color-violet-300)', ringClass: 'stroke-[var(--color-violet-300)]' },
  spirituality: { icon: Flower2, color: 'var(--color-violet-600)', ringClass: 'stroke-[var(--color-violet-600)]' },
}

// `Date.now()` specifically trips apps/web's `react-hooks/purity` lint rule
// even outside a hook (Session 24 found this) — `new Date().getTime()` does not.
function timeAgo(iso: string): string {
  const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 14) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <p className="text-lg lg:text-xl text-white font-medium">{value}</p>
      <p className="text-[11px] text-white/40 mt-1">{label}</p>
    </Card>
  )
}

function GrowthTrackerContent() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [decisions, setDecisions] = useState<DecisionsListResponse['decisions']>([])
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const data = await getDashboard()
        setDashboard(data)
      } catch {
        // Degrades to the same empty-state tolerance every other page here uses.
      } finally {
        setLoading(false)
      }

      // Fetched separately, own failure boundary — same pattern Dashboard uses.
      getDecisionsList().then((r) => setDecisions(r.decisions)).catch(() => {})
      getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {})
    }
    load()
  }, [router])

  const recentDecisions = decisions.slice(0, 4)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
              Growth Tracker <TrendingUp className="w-5 h-5 text-[var(--color-violet-400)]" />
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">A snapshot of your journey across all areas of life.</p>
          </div>
          <Link
            href="/mirror/new"
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[var(--color-border-glass)] px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[var(--color-amber-400)]" /> Breathe &amp; Check In
          </Link>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Alignment Score + this slice's two new real counts. */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Alignment Score" value={loading ? '…' : dashboard?.alignmentScore != null ? `${dashboard.alignmentScore}%` : '—'} />
              <StatTile label="Patterns Shifting" value={loading ? '…' : String(dashboard?.patternsShifting ?? 0)} />
              <StatTile label="Insights Gained" value={loading ? '…' : String(dashboard?.insightsGained ?? 0)} />
            </div>

            {/* Domains of Life — same real aggregate Dashboard's "Life
                Domains" card reads, rendered as rings here to match this
                page's own reference composition. Only domains the person has
                actually explored appear — never padded to a fixed 7. */}
            {!loading && (dashboard?.lifeDomains?.length ?? 0) > 0 && (
              <Card>
                <p className="text-sm text-white mb-1">Domains of Life</p>
                <p className="text-xs text-white/40 mb-4">Your alignment across key life areas</p>
                {/* A single-column list, not a multi-column grid: a grid's
                    column count is keyed to viewport width, but this card's
                    own rendered width is a fraction of the viewport (it
                    shares the row with a sidebar at lg+, and sits inside
                    page padding below it) — a `sm:`/`lg:` column count tuned
                    by eye kept breaking at whatever width fell in between,
                    since two-word labels ("Health & Body") need more room
                    than a narrow column has, no matter which breakpoint
                    triggers it. A full-width row per domain sidesteps the
                    mismatch entirely: this is the layout that survived the
                    live iteration below. */}
                <div className="space-y-3">
                  {dashboard!.lifeDomains.map((d) => {
                    const meta = DOMAIN_META[d.domain]
                    const Icon = meta.icon
                    return (
                      <div key={d.domain} className="flex items-center gap-3">
                        <ProgressRing percent={d.percent} size={40} strokeWidth={4} colorClassName={meta.ringClass}>
                          <Icon className="w-3 h-3" style={{ color: meta.color }} />
                        </ProgressRing>
                        <span className="text-sm text-white/80 flex-1">{LIFE_DOMAIN_LABELS[d.domain]}</span>
                        <span className="text-xs text-white/40 shrink-0">{d.percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Roadmap timeline — the exact same real card Dashboard shows,
                shared via RoadmapTimelineCard so the two never drift apart. */}
            {!loading && dashboard?.roadmap && <RoadmapTimelineCard roadmap={dashboard.roadmap} />}

            {/* Leading Archetypes — same real aggregate Dashboard reads. */}
            {!loading && (dashboard?.archetypes?.length ?? 0) > 0 && (
              <Card>
                <p className="text-sm text-white mb-1">Leading Archetypes</p>
                <p className="text-xs text-white/40 mb-4">The energies that show up for you</p>
                <div className="grid grid-cols-2 gap-3">
                  {dashboard!.archetypes.map((a) => (
                    <div key={a.archetype} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-violet-500)] to-[var(--color-amber-400)] flex items-center justify-center text-[10px] font-medium text-white shrink-0">
                        {a.percent}%
                      </div>
                      <span className="text-sm text-white/70">{ARCHETYPE_LABELS[a.archetype]}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Core Pillars / Emotional Landscape — deliberate honest empty
                states, see this file's own doc comment above. Not built
                as real widgets because nothing in this codebase computes
                either concept yet. */}
            <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
              <Card className="opacity-80">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-white/40" />
                  <p className="text-sm text-white">Core Pillars</p>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Needs more real usage data before DPNR can compute a meaningful pillar-alignment
                  score. Not built yet — this is an honest gap, not a bug.
                </p>
              </Card>
              <Card className="opacity-80">
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="w-4 h-4 text-white/40" />
                  <p className="text-sm text-white">Emotional Landscape</p>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Needs a real emotion/sentiment-tracking model behind it, which doesn&apos;t exist
                  yet. Not built yet — this is an honest gap, not a bug.
                </p>
              </Card>
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
            <Card>
              <p className="text-sm text-white mb-1">Recent Decisions</p>
              <p className="text-xs text-white/40 mb-4">From your past decisions</p>
              {loading ? (
                <p className="text-xs text-white/40">Loading…</p>
              ) : recentDecisions.length === 0 ? (
                <p className="text-xs text-white/40">
                  No decisions yet.{' '}
                  <Link href="/decision/new" className="text-[var(--color-violet-300)] hover:underline">
                    Start one
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-1">
                  {recentDecisions.map((d) => (
                    <Link
                      key={d.decisionId}
                      href={`/decision/${d.decisionId}`}
                      className="flex items-center justify-between gap-3 rounded-xl -mx-2 px-2 py-2 hover:bg-white/5 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 line-clamp-1">{d.title}</p>
                        <p className="text-xs text-white/40">{timeAgo(d.createdAt)}</p>
                      </div>
                      <span className="text-xs text-white/40 capitalize shrink-0">{d.status}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {!loading && dailyCard ? (
              <DailyGuidanceCard dailyCard={dailyCard} title="This Week's Reflection" showImage={false} />
            ) : (
              !loading && (
                <Card>
                  <p className="text-sm text-white mb-2">This Week&apos;s Reflection</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Nothing yet this week — your next Daily Card will show up here.
                  </p>
                </Card>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GrowthTrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-base)]" />}>
      <GrowthTrackerContent />
    </Suspense>
  )
}
