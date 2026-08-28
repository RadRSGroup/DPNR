'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Eye, HeartHandshake, Repeat, Plus, Target } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getDashboard, getTwin, getCommitments, createCommitment } from '@/lib/api/v1-client'
import type { DashboardResponse, TwinListResponse, CommitmentsResponse, LifeDomainCategory } from '@dpnr/shared-types'
import { LIFE_DOMAIN_LABELS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'
import { DOMAIN_META } from '@/components/shared/domain-meta'

/**
 * My Evolution Map (Slice 5 of the 6-slice reference-mockup parity plan,
 * `docs/AGENT_LOG.md`/`C:\Users\rekkawi\.claude\plans\mellow-questing-milner.md`).
 *
 * Life Domains + drill-down reuse `GET /v1/dashboard`'s `lifeDomains`
 * (identical aggregate Growth Tracker/Dashboard already show) plus that
 * domain's own confirmed `GET /v1/twin` signals as "Focus Areas" — real,
 * derived, never padded to a fixed list. Goals & Dreams is fully real: it
 * reads/writes the same `CommitmentItem`/`POST,GET /v1/commitments`
 * Slice 1 already built (the `lifeDomain` tag and "null reviewDate means
 * Ongoing" convention both existed before this page did) — there is no new
 * backend here, only a UI that was missing.
 *
 * The 4-stage "Awareness / Healing / Practice / Integration" band below is
 * a fixed, always-the-same conceptual framing, not a per-user progress
 * tracker — nothing in this codebase can compute which of the four stages
 * someone is "in", so it never claims one. It's the same "conceptual layer
 * over real state" pattern `DecisionRoomLanding.tsx`'s `JOURNEY` constant
 * already uses for Decision Room's own step overview: an explanatory
 * illustration, paired here with the real `RoadmapTimelineCard` right below
 * it rather than fused into fake per-stage checkmarks.
 */

const STAGES = [
  { label: 'Awareness', icon: Eye, copy: 'Understand your patterns and where you are today.' },
  { label: 'Healing', icon: HeartHandshake, copy: 'Release what has been holding you back.' },
  { label: 'Practice', icon: Repeat, copy: 'Build new habits and ways of relating.' },
  { label: 'Integration', icon: Sparkles, copy: 'Live your values as your natural way of being.' },
]

function EvolutionMapContent() {
  const router = useRouter()
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [twin, setTwin] = useState<TwinListResponse | null>(null)
  const [commitments, setCommitments] = useState<CommitmentsResponse['commitments']>([])
  const [loading, setLoading] = useState(true)
  const [selectedDomain, setSelectedDomain] = useState<LifeDomainCategory | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [goalDescription, setGoalDescription] = useState('')
  const [goalReviewDate, setGoalReviewDate] = useState('')
  const [goalDomain, setGoalDomain] = useState<LifeDomainCategory | ''>('')
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const [dashboardData, twinData, commitmentsData] = await Promise.all([getDashboard(), getTwin(), getCommitments()])
        setDashboard(dashboardData)
        setTwin(twinData)
        setCommitments(commitmentsData.commitments)
        if (dashboardData.lifeDomains.length > 0) setSelectedDomain(dashboardData.lifeDomains[0].domain)
      } catch {
        // Degrades to the same empty-state tolerance every other page here uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const focusAreas = useMemo(
    () => (twin?.signals ?? []).filter((s) => s.status === 'confirmed' && s.lifeDomain === selectedDomain),
    [twin, selectedDomain]
  )

  const openGoals = useMemo(() => {
    const open = commitments.filter((c) => c.status === 'open')
    return selectedDomain ? open.filter((c) => c.lifeDomain === selectedDomain) : open
  }, [commitments, selectedDomain])

  function openAddGoal() {
    setGoalDescription('')
    setGoalReviewDate('')
    setGoalDomain(selectedDomain ?? '')
    setShowAddGoal(true)
  }

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!goalDescription.trim() || savingGoal) return
    setSavingGoal(true)
    try {
      const created = await createCommitment({
        description: goalDescription.trim(),
        reviewDate: goalReviewDate || null,
        lifeDomain: goalDomain || undefined,
      })
      setCommitments((prev) => [created, ...prev])
      setShowAddGoal(false)
    } catch {
      // Leave the form open with what the person typed so they can retry.
    } finally {
      setSavingGoal(false)
    }
  }

  const hasDomains = !loading && dashboard != null && dashboard.lifeDomains.length > 0

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
            My Evolution Map <Sparkles className="w-5 h-5 text-[var(--color-violet-400)]" />
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Your personal roadmap to growth, alignment, and the life you&apos;re here to create.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {!loading && !hasDomains && (
              <Card>
                <p className="text-sm text-white mb-2">Life Domains</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  Nothing here yet — complete a Decision Room or Mirror Room session and confirm a few
                  signals in InnerSelf to start building your Life Domains picture.
                </p>
              </Card>
            )}

            {hasDomains && (
              <Card>
                <p className="text-sm text-white mb-1">Life Domains</p>
                <p className="text-xs text-white/40 mb-4">Explore and grow in every area of your life</p>
                <div className="space-y-2">
                  {dashboard!.lifeDomains.map((d) => {
                    const meta = DOMAIN_META[d.domain]
                    const Icon = meta.icon
                    const selected = d.domain === selectedDomain
                    return (
                      <button
                        key={d.domain}
                        onClick={() => setSelectedDomain(d.domain)}
                        className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                          selected ? 'bg-white/10 border border-[var(--color-violet-500)]/50' : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <ProgressRing percent={d.percent} size={40} strokeWidth={4} colorClassName={meta.ringClass}>
                          <Icon className="w-3 h-3" style={{ color: meta.color }} />
                        </ProgressRing>
                        <span className="text-sm text-white/80 flex-1">{LIFE_DOMAIN_LABELS[d.domain]}</span>
                        <span className="text-xs text-white/40 shrink-0">{d.percent}%</span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            )}

            {hasDomains && selectedDomain && (
              <Card>
                <p className="text-sm text-white mb-1">Focus Areas — {LIFE_DOMAIN_LABELS[selectedDomain]}</p>
                <p className="text-xs text-white/40 mb-4">What DPNR has confirmed with you here</p>
                {focusAreas.length === 0 ? (
                  <p className="text-xs text-white/40">Nothing confirmed in this domain yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {focusAreas.map((s) => (
                      <li key={s.signalId} className="flex items-start gap-2 text-sm text-white/70">
                        <Target className="w-3.5 h-3.5 mt-0.5 text-[var(--color-violet-400)] shrink-0" />
                        <span>{s.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* A fixed conceptual band, not a per-user progress tracker — see
                this file's own doc comment above. */}
            <Card>
              <p className="text-sm text-white mb-1">The Shape of This Work</p>
              <p className="text-xs text-white/40 mb-4">
                A general framework for this kind of growth work — not a tracker of exactly where you are.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {STAGES.map((stage) => (
                  <div key={stage.label} className="text-center">
                    <div className="w-9 h-9 mx-auto rounded-full border border-white/15 flex items-center justify-center mb-2">
                      <stage.icon className="w-4 h-4 text-white/50" />
                    </div>
                    <p className="text-white text-xs font-medium">{stage.label}</p>
                    <p className="text-white/30 text-[10px] mt-0.5 leading-snug hidden sm:block">{stage.copy}</p>
                  </div>
                ))}
              </div>
            </Card>

            {!loading && dashboard?.roadmap && <RoadmapTimelineCard roadmap={dashboard.roadmap} />}
          </div>

          {/* Side column */}
          <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
            <Card>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-white">
                  Goals &amp; Dreams{selectedDomain ? ` — ${LIFE_DOMAIN_LABELS[selectedDomain]}` : ''}
                </p>
                <button
                  onClick={openAddGoal}
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Goal
                </button>
              </div>
              <p className="text-xs text-white/40 mb-4">What you truly want to create</p>

              {showAddGoal && (
                <form onSubmit={submitGoal} className="mb-4 space-y-2 rounded-xl bg-white/5 border border-[var(--color-border-glass)] p-3">
                  <textarea
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="What do you want to create?"
                    required
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-violet-500)]/60"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={goalDomain}
                      onChange={(e) => setGoalDomain(e.target.value as LifeDomainCategory | '')}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[var(--color-violet-500)]/60"
                    >
                      <option value="">No domain</option>
                      {Object.entries(LIFE_DOMAIN_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={goalReviewDate}
                      onChange={(e) => setGoalReviewDate(e.target.value)}
                      title="Leave blank for Ongoing"
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[var(--color-violet-500)]/60"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingGoal || !goalDescription.trim()}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors disabled:opacity-50"
                    >
                      {savingGoal ? 'Saving…' : 'Save goal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddGoal(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {loading ? (
                <p className="text-xs text-white/40">Loading…</p>
              ) : openGoals.length === 0 ? (
                <p className="text-xs text-white/40">No goals here yet.</p>
              ) : (
                <div className="space-y-2">
                  {openGoals.map((g) => (
                    <div key={g.commitmentId} className="rounded-xl bg-white/5 px-3 py-2.5">
                      <p className="text-sm text-white/80">{g.description}</p>
                      <p className="text-xs text-white/40 mt-1">
                        Target: {g.reviewDate ?? 'Ongoing'}
                        {!selectedDomain && g.lifeDomain && ` · ${LIFE_DOMAIN_LABELS[g.lifeDomain]}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EvolutionMapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-base)]" />}>
      <EvolutionMapContent />
    </Suspense>
  )
}
