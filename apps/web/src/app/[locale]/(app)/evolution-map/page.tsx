'use client'
import Image from 'next/image'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Infinity as InfinityIcon, Eye, HeartHandshake, Repeat, Plus, Target, ChevronDown, Compass } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getDashboard, getTwin, getCommitments, createCommitment, completeCommitment, getOnboardingSnapshot } from '@/lib/api/v1-client'
import type { DashboardResponse, TwinListResponse, CommitmentsResponse, LifeDomainCategory, OnboardingSnapshotResponse } from '@dpnr/shared-types'
import { LIFE_DOMAIN_IDS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'
import StatTile from '@/components/shared/StatTile'
import { DOMAIN_META } from '@/components/shared/domain-meta'
import Dictatable from '@/components/ui/Dictatable'

/**
 * Page role (founder-approved split, 2026-09-29; spec §14): the direction
 * the person chose (their intention, goals and dreams, the roadmap), not a
 * second view of what DPNR has observed. So the domain rings here show goal
 * progress with a real denominator (goals completed / goals set in that
 * area) instead of the share-of-signals % Dashboard and Growth show, and
 * the old "Average Progress" tile (a mean of shares that always sum to
 * ~100, so it measured nothing) is gone. "Your direction" shows the
 * person's own onboarding answers. Focus Areas (confirmed signals) stay
 * under each domain as the evidence behind it (user request, Session 83).
 *
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

// label/copy are keys into EvolutionMap.stages, resolved via t() at render
// time — module scope has no hook access.
const STAGES = [
  { id: 'awareness', icon: Eye },
  { id: 'healing', icon: HeartHandshake },
  { id: 'practice', icon: Repeat },
  { id: 'integration', icon: InfinityIcon },
]

function EvolutionMapContent() {
  const t = useTranslations('EvolutionMap')
  const tDomains = useTranslations('Dashboard.lifeDomains')
  const tDesired = useTranslations('Onboarding.cards.desiredStates.options')
  const locale = useLocale()
  const router = useRouter()
  const [onboarding, setOnboarding] = useState<OnboardingSnapshotResponse | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [twin, setTwin] = useState<TwinListResponse | null>(null)
  const [commitments, setCommitments] = useState<CommitmentsResponse['commitments']>([])
  const [loading, setLoading] = useState(true)
  const [selectedDomain, setSelectedDomain] = useState<LifeDomainCategory | null>(null)
  // Which domain's Focus Areas are open under its row; all start collapsed.
  const [expandedDomain, setExpandedDomain] = useState<LifeDomainCategory | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [goalDescription, setGoalDescription] = useState('')
  const [goalReviewDate, setGoalReviewDate] = useState('')
  const [goalDomain, setGoalDomain] = useState<LifeDomainCategory | ''>('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const [dashboardData, twinData, commitmentsData] = await Promise.all([getDashboard(), getTwin(), getCommitments()])
        setDashboard(dashboardData)
        setTwin(twinData)
        setCommitments(commitmentsData.commitments)
        // Own failure boundary: the direction card just doesn't show.
        getOnboardingSnapshot().then(setOnboarding).catch(() => {})
      } catch {
        // Degrades to the same empty-state tolerance every other page here uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const focusAreasByDomain = useMemo(() => {
    const byDomain = new Map<LifeDomainCategory, NonNullable<typeof twin>['signals']>()
    for (const s of twin?.signals ?? []) {
      if (s.status !== 'confirmed' || !s.lifeDomain) continue
      byDomain.set(s.lifeDomain, [...(byDomain.get(s.lifeDomain) ?? []), s])
    }
    return byDomain
  }, [twin])

  // Every open goal, always — goals in the selected domain first. This used
  // to filter to the selected domain (auto-set to the first one on load), so
  // a goal saved with no domain or a different one was counted in "Active
  // Goals" above but never listed (beta report, Session 68).
  const openGoals = useMemo(() => {
    const open = commitments.filter((c) => c.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!selectedDomain) return open
    return [...open.filter((c) => c.lifeDomain === selectedDomain), ...open.filter((c) => c.lifeDomain !== selectedDomain)]
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

  async function markGoalComplete(commitmentId: string) {
    if (completingId) return
    setCompletingId(commitmentId)
    try {
      // Grants the "Weekly Goal Achieved" credit reward server-side (My
      // Wallet, Slice 6) — no reward shown here, the credits count in the
      // Sidebar/Wallet reflects it on next load.
      await completeCommitment(commitmentId)
      setCommitments((prev) => prev.map((c) => (c.commitmentId === commitmentId ? { ...c, status: 'completed' } : c)))
    } catch {
      // Leave it in the open list so the person can retry.
    } finally {
      setCompletingId(null)
    }
  }

  // Goals per domain: the real denominator for this page's rings. "dropped"
  // goals are neither done nor pending, so they don't count either way.
  const goalsByDomain = useMemo(() => {
    const map = new Map<LifeDomainCategory, { total: number; done: number }>()
    for (const c of commitments) {
      if (!c.lifeDomain || c.status === 'dropped') continue
      const cur = map.get(c.lifeDomain) ?? { total: 0, done: 0 }
      cur.total += 1
      if (c.status === 'completed') cur.done += 1
      map.set(c.lifeDomain, cur)
    }
    return map
  }, [commitments])

  // Domains that carry the person's direction: ones they have goals in,
  // named at onboarding, or where DPNR has confirmed Focus Areas. Spec order.
  const directionDomains = useMemo(
    () =>
      LIFE_DOMAIN_IDS.filter(
        (d) => goalsByDomain.has(d) || focusAreasByDomain.has(d) || onboarding?.activeDomains.includes(d)
      ),
    [goalsByDomain, focusAreasByDomain, onboarding]
  )
  const hasDomains = !loading && directionDomains.length > 0

  // "Your Map at a Glance": all counts from the person's own goals.
  const openCommitments = commitments.filter((c) => c.status === 'open')
  const areasInFocusCount = new Set(openCommitments.flatMap((c) => (c.lifeDomain ? [c.lifeDomain] : []))).size
  const activeGoalsCount = openCommitments.length
  const completedGoals = commitments.filter((c) => c.status === 'completed')
  const milestonesAchievedCount = completedGoals.length
  const today = new Date().toISOString().slice(0, 10)
  const nextReview = openCommitments
    .map((c) => c.reviewDate)
    .filter((d): d is string => !!d && d >= today)
    .sort()[0]
  const formatDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const hasDirection =
    !!onboarding && (!!onboarding.currentIntention?.trim() || onboarding.activeDomains.length > 0 || onboarding.desiredStates.length > 0)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/evolution-map-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Card className="relative overflow-hidden !p-0 mb-4 lg:mb-6 hidden lg:block">
          <div className="relative h-40 lg:h-48">
            <Image
              src="/images/evolution-map/evolution-map-hero.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col items-start justify-end p-5 lg:p-8">
              <h2 className="font-display text-xl lg:text-2xl text-white">{t('hero.title')}</h2>
              <p className="text-white/60 text-sm mt-1 max-w-sm">{t('hero.subtitle')}</p>
            </div>
          </div>
        </Card>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* Your Map at a Glance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile label={t('glance.areasInFocus')} value={loading ? '…' : String(areasInFocusCount)} />
              <StatTile label={t('glance.activeGoals')} value={loading ? '…' : String(activeGoalsCount)} />
              <StatTile label={t('glance.milestonesAchieved')} value={loading ? '…' : String(milestonesAchievedCount)} />
              <StatTile label={t('glance.nextReview')} value={loading ? '…' : nextReview ? formatDate(nextReview) : '—'} />
            </div>

            {/* Your direction: the person's own words from onboarding. */}
            {hasDirection && (
              <Card>
                <p className="flex items-center gap-2 text-sm text-white mb-1">
                  <Compass className="w-4 h-4 text-[var(--color-amber-400)]" aria-hidden /> {t('direction.title')}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('direction.subtitle')}</p>
                {onboarding!.currentIntention?.trim() && (
                  <p className="font-display text-lg text-white/90 leading-snug mb-4">“{onboarding!.currentIntention.trim()}”</p>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                  {onboarding!.activeDomains.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">{t('direction.areas')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {onboarding!.activeDomains.map((d) => (
                          <span key={d} className="text-xs text-white/75 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">{tDomains(`labels.${d}`)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {onboarding!.desiredStates.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">{t('direction.moreOf')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {onboarding!.desiredStates.map((d) => (
                          <span key={d} className="text-xs text-white/75 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">{tDesired(d)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {!loading && !hasDomains && (
              <Card>
                <p className="text-sm text-white mb-2">{t('lifeDomains.title')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
                  {t('lifeDomains.empty')}
                </p>
              </Card>
            )}

            {hasDomains && (
              <Card>
                <p className="text-sm text-white mb-1">{t('lifeDomains.title')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('lifeDomains.subtitle')}</p>
                <div className="space-y-2">
                  {directionDomains.map((domain) => {
                    const meta = DOMAIN_META[domain]
                    // An id from an older/newer API bundle is skipped, not a crash.
                    if (!meta) return null
                    const Icon = meta.icon
                    const selected = domain === selectedDomain
                    const expanded = domain === expandedDomain
                    const focusAreas = focusAreasByDomain.get(domain) ?? []
                    const panelId = `focus-areas-${domain}`
                    const goals = goalsByDomain.get(domain)
                    const goalPercent = goals && goals.total > 0 ? Math.round((goals.done / goals.total) * 100) : 0
                    return (
                      <div
                        key={domain}
                        className={`rounded-xl transition-colors ${
                          selected ? 'bg-white/10 border border-[var(--color-violet-500)]/50' : 'border border-transparent hover:bg-white/5'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setSelectedDomain(domain)
                            setExpandedDomain(expanded ? null : domain)
                          }}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          className="w-full flex items-center gap-3 px-2 py-2 text-start"
                        >
                          <ProgressRing percent={goalPercent} size={40} strokeWidth={4} colorClassName={meta.ringClass}>
                            <Icon className="w-3 h-3" style={{ color: meta.color }} />
                          </ProgressRing>
                          <span className="text-sm text-white/80 flex-1">{tDomains(`labels.${domain}`)}</span>
                          <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">
                            {goals ? t('lifeDomains.goalsDone', { done: goals.done, total: goals.total }) : t('lifeDomains.noGoals')}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-white/50 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>
                        {expanded && (
                          <div id={panelId} className="animate-settle-in px-3 pb-3 ps-[3.75rem]">
                            <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{t('focusAreas.subtitle')}</p>
                            {focusAreas.length === 0 ? (
                              <p className="text-xs text-[var(--color-text-tertiary)]">{t('focusAreas.empty')}</p>
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
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* A fixed conceptual band, not a per-user progress tracker — see
                this file's own doc comment above. */}
            <Card>
              <p className="text-sm text-white mb-1">{t('shapeOfWork.title')}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">
                {t('shapeOfWork.subtitle')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {STAGES.map((stage) => (
                  <div key={stage.id} className="text-center">
                    <div className="w-9 h-9 mx-auto rounded-full border border-white/15 flex items-center justify-center mb-2">
                      <stage.icon className="w-4 h-4 text-white/50" />
                    </div>
                    <p className="text-white text-xs font-medium">{t(`stages.${stage.id}.label`)}</p>
                    <p className="text-[var(--color-text-tertiary)] text-[10px] mt-0.5 leading-snug hidden sm:block">{t(`stages.${stage.id}.copy`)}</p>
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
                  {t('goals.title')}
                </p>
                <button
                  onClick={openAddGoal}
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)]"
                >
                  <Plus className="w-3.5 h-3.5" /> {t('goals.addGoal')}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('goals.subtitle')}</p>

              {showAddGoal && (
                <form onSubmit={submitGoal} className="mb-4 space-y-2 rounded-xl bg-white/5 border border-[var(--color-border-glass)] p-3">
                  <Dictatable>
                    <textarea
                      value={goalDescription}
                      onChange={(e) => setGoalDescription(e.target.value)}
                      placeholder={t('goals.placeholder')}
                      required
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
                    />
                  </Dictatable>
                  <div className="flex items-center gap-2">
                    <select
                      value={goalDomain}
                      onChange={(e) => setGoalDomain(e.target.value as LifeDomainCategory | '')}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[var(--color-violet-500)]/60"
                    >
                      <option value="">{t('goals.noDomain')}</option>
                      {LIFE_DOMAIN_IDS.map((value) => (
                        <option key={value} value={value}>{tDomains(`labels.${value}`)}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={goalReviewDate}
                      onChange={(e) => setGoalReviewDate(e.target.value)}
                      aria-describedby="goal-date-hint"
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none focus:border-[var(--color-violet-500)]/60"
                    />
                  </div>
                  {/* Was a hover-only title on the date input; visible now so touch users see it too. */}
                  <p id="goal-date-hint" className="text-[11px] text-[var(--color-text-tertiary)]">{t('goals.leaveBlankOngoing')}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={savingGoal || !goalDescription.trim()}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors disabled:opacity-50"
                    >
                      {savingGoal ? t('goals.saving') : t('goals.saveGoal')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddGoal(false)}
                      className="rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
                    >
                      {t('goals.cancel')}
                    </button>
                  </div>
                </form>
              )}

              {loading ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('goals.loading')}</p>
              ) : openGoals.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('goals.empty')}</p>
              ) : (
                <div className="space-y-2">
                  {openGoals.map((g) => (
                    <div key={g.commitmentId} className="rounded-xl bg-white/5 px-3 py-2.5">
                      <p className="text-sm text-white/80">{g.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {g.reviewDate && g.reviewDate < today
                            ? t('goals.reviewDue', { date: formatDate(g.reviewDate) })
                            : t('goals.target', { date: g.reviewDate ? formatDate(g.reviewDate) : t('goals.ongoing') })}
                          {g.lifeDomain && ` · ${tDomains(`labels.${g.lifeDomain}`)}`}
                        </p>
                        <button
                          onClick={() => markGoalComplete(g.commitmentId)}
                          disabled={completingId === g.commitmentId}
                          className="text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)] disabled:opacity-40 shrink-0 ms-2"
                        >
                          {completingId === g.commitmentId ? t('goals.marking') : t('goals.markComplete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {completedGoals.length > 0 && (
                <div className="mt-4 border-t border-white/8 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((v) => !v)}
                    aria-expanded={showCompleted}
                    className="w-full flex items-center justify-between text-xs text-white/60 hover:text-white/85 transition-colors"
                  >
                    {t('goals.completed', { count: completedGoals.length })}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCompleted ? 'rotate-180' : ''}`} aria-hidden />
                  </button>
                  {showCompleted && (
                    <ul className="mt-2 space-y-1.5 animate-settle-in">
                      {completedGoals.map((g) => (
                        <li key={g.commitmentId} className="text-xs text-white/55 line-through decoration-white/25">{g.description}</li>
                      ))}
                    </ul>
                  )}
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
