'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TrendingUp, Sparkles, Layers, Waves } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getDashboard, getDecisionsList, getCompanionContext, getGrowthValuesNeeds } from '@/lib/api/v1-client'
import type { DashboardResponse, DecisionsListResponse, CompanionContextResponse, GrowthValuesNeedsResponse } from '@dpnr/shared-types'
import { LIFE_DOMAIN_LABELS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'
import AlignmentHistoryChart from '@/components/shared/AlignmentHistoryChart'
import { DOMAIN_META } from '@/components/shared/domain-meta'
import StatTile from '@/components/shared/StatTile'
import ArchetypeBadge from '@/components/shared/ArchetypeBadge'
import { timeAgo } from '@/lib/format'

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
 * session to quietly "complete" with fabricated numbers. "Pillars Snapshot"
 * (a radar-chart re-visualization of the same 5 concepts) is bundled under
 * this same honest gap for the same reason.
 *
 * Values & Needs Snapshot is real, added later: `GET
 * /v1/rooms/decisions/values-needs` tallies every `value`/`need`-typed tag
 * ever submitted across all of a person's past decisions (Decision Room's
 * VALUES_NEEDS step) by label frequency — genuine cross-decision
 * aggregation, not a stub or a new taxonomy.
 */

function GrowthTrackerContent() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [decisions, setDecisions] = useState<DecisionsListResponse['decisions']>([])
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [valuesNeeds, setValuesNeeds] = useState<GrowthValuesNeedsResponse | null>(null)
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
      getGrowthValuesNeeds().then(setValuesNeeds).catch(() => {})
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
            {/* Alignment Score + this slice's real monthly counts. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label="Alignment Score" value={loading ? '…' : dashboard?.alignmentScore != null ? `${dashboard.alignmentScore}%` : '—'} />
              <StatTile label="Areas Growing" value={loading ? '…' : String(dashboard?.areasGrowing ?? 0)} />
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

            {/* Alignment Over Time — the same real daily snapshots Dashboard's
                compact "My Evolution" sparkline reads (`GET /v1/dashboard`'s
                `alignmentHistory`), charted properly here with axis labels
                and a 7D/30D range toggle. `>= 2` matches Dashboard's own
                honesty gate — a single point can't show a trend. */}
            {!loading && (dashboard?.alignmentHistory?.length ?? 0) >= 2 && (
              <Card>
                <p className="text-sm text-white mb-1">Alignment Over Time</p>
                <p className="text-xs text-white/40 mb-4">Your overall alignment trend</p>
                <AlignmentHistoryChart points={dashboard!.alignmentHistory} />
              </Card>
            )}

            {/* Roadmap timeline — the exact same real card Dashboard shows,
                shared via RoadmapTimelineCard so the two never drift apart. */}
            {!loading && dashboard?.roadmap && <RoadmapTimelineCard roadmap={dashboard.roadmap} />}

            {/* Your Archetypes — same real aggregate Dashboard reads, titled
                to match this screen's own reference label (the reference's
                different-looking archetype names on this specific page are
                mockup inconsistency, not a second real taxonomy — see
                archetype-meta.ts). Illustrated via a shared icon+gradient
                badge rather than the reference's portrait photography, which
                has no real asset behind it. */}
            {!loading && (dashboard?.archetypes?.length ?? 0) > 0 && (
              <Card>
                <p className="text-sm text-white mb-1">Your Archetypes</p>
                <p className="text-xs text-white/40 mb-4">The energies that show up for you</p>
                <div className="grid grid-cols-2 gap-3">
                  {dashboard!.archetypes.map((a) => (
                    <ArchetypeBadge key={a.archetype} archetype={a.archetype} percent={a.percent} />
                  ))}
                </div>
              </Card>
            )}

            {/* Values & Needs Snapshot — real cross-decision tag aggregate,
                see this file's own doc comment above. Omitted entirely
                (rather than shown empty) if the person hasn't reached
                Decision Room's VALUES_NEEDS step in any decision yet. */}
            {!loading && ((valuesNeeds?.topValues.length ?? 0) > 0 || (valuesNeeds?.topNeeds.length ?? 0) > 0) && (
              <Card>
                <p className="text-sm text-white mb-1">Values &amp; Needs Snapshot</p>
                <p className="text-xs text-white/40 mb-4">What drives you and what you need more of</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wide mb-2">Top Values</p>
                    {valuesNeeds!.topValues.length === 0 ? (
                      <p className="text-xs text-white/30">Nothing yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {valuesNeeds!.topValues.map((v) => (
                          <span key={v} className="text-xs text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wide mb-2">Top Needs</p>
                    {valuesNeeds!.topNeeds.length === 0 ? (
                      <p className="text-xs text-white/30">Nothing yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {valuesNeeds!.topNeeds.map((n) => (
                          <span key={n} className="text-xs text-white/70 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
                            {n}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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
