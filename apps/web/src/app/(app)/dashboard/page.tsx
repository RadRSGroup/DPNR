'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, Heart, Sparkles } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import {
  getDashboard,
  getTwin,
  getCompanionContext,
  acceptRoadmapProposal,
  rejectRoadmapProposal,
  updateRoadmapLifecycle,
} from '@/lib/api/v1-client'
import type { DashboardResponse, TwinListResponse, CompanionContextResponse } from '@dpnr/shared-types'
import { LIFE_DOMAIN_LABELS, ARCHETYPE_LABELS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'
import TwinCalibrationCard from '@/components/shared/TwinCalibrationCard'

/**
 * Labels for continuityCue kinds OTHER than 'daily_card' — that one now
 * renders via the real, feedback-capable `DailyGuidanceCard` instead (see
 * below), fetched independently via `getCompanionContext()` since
 * `DashboardResponse.continuityCue` only ever carries `{kind, text}`, not
 * the real item's `feedback` field DailyGuidanceCard needs. The backend
 * picks continuityCue's kind as 'daily_card' whenever a real Daily Card
 * exists for today (infra/cdk/lambda/dashboard/handler.ts's own priority
 * comment), so this is never a second, different concept — it's the same
 * item continuityCue was already describing, just shown once, correctly.
 */
const CUE_LABEL: Record<Exclude<NonNullable<DashboardResponse['continuityCue']>['kind'], 'daily_card'>, string> = {
  continuation: 'Continuing on',
  commitment: 'Upcoming commitment',
  roadmap_cue: 'Worth exploring',
  recommended_space: 'Worth exploring',
}

const ROOM_LINK: Record<'decision' | 'mirror' | 'library', { href: string; label: string }> = {
  decision: { href: '/decision/new', label: 'Decision Room' },
  mirror: { href: '/mirror/new', label: 'Mirror Room' },
  library: { href: '/library', label: 'Content & Learning' },
}

// This page previously listed every past decision via the old Supabase
// `getDecisions()` query — dropped in this rewrite onto the real
// `GET /v1/dashboard` (docs/PHASE_AUDIT.md §4.6), which has no equivalent
// "list my decisions" field in its contract. An honest gap, not a silent
// regression: a future session adding a real decision-history read should
// restore this rather than reinventing it from Dashboard's own aggregate.

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const justCompleted = params.get('completed') === 'true'

  const [firstName, setFirstName] = useState('')
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [twin, setTwin] = useState<TwinListResponse | null>(null)
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [loading, setLoading] = useState(true)
  const [proposalPending, setProposalPending] = useState(false)
  const [lifecyclePending, setLifecyclePending] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        const namePart = email?.split('@')[0] ?? ''
        setFirstName(namePart.charAt(0).toUpperCase() + namePart.slice(1))

        const [data, twinData] = await Promise.all([getDashboard(), getTwin()])
        setDashboard(data)
        setTwin(twinData)
      } catch {
        // silently degrade — the page below already handles a null dashboard
      } finally {
        setLoading(false)
      }

      // Fetched separately, own failure boundary — a Companion-context
      // hiccup shouldn't take down the rest of the Dashboard over one widget.
      getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {})
    }
    load()
  }, [router])

  async function handleProposalAction(action: 'accept' | 'reject') {
    if (proposalPending) return
    setProposalPending(true)
    try {
      if (action === 'accept') {
        const newRoadmap = await acceptRoadmapProposal()
        setDashboard((prev) => (prev ? { ...prev, roadmap: newRoadmap, roadmapProposal: null } : prev))
      } else {
        await rejectRoadmapProposal()
        setDashboard((prev) => (prev ? { ...prev, roadmapProposal: null } : prev))
      }
    } catch {
      // Leave the proposal card as-is — the buttons remain available to retry.
    } finally {
      setProposalPending(false)
    }
  }

  // Intelligence Spec §17 — Roadmap Lifecycle pause/resume/archive.
  async function handleLifecycleAction(action: 'pause' | 'resume' | 'archive') {
    if (lifecyclePending) return
    setLifecyclePending(true)
    try {
      const { lifecycleState } = await updateRoadmapLifecycle(action)
      setDashboard((prev) => (prev?.roadmap ? { ...prev, roadmap: { ...prev.roadmap, lifecycleState } } : prev))
    } catch {
      // Leave the roadmap card as-is — the buttons remain available to retry.
    } finally {
      setLifecyclePending(false)
    }
  }

  const suggestedSpace = dashboard?.roadmap?.suggestedSpaces?.[0] as keyof typeof ROOM_LINK | undefined
  const confirmedPatterns = (twin?.signals ?? [])
    .filter((s) => s.domain === 'pattern' && s.status === 'confirmed')
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
              Good morning{firstName ? `, ${firstName}` : ''} <Sparkles className="w-5 h-5 text-[var(--color-amber-400)]" />
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Your journey. Your awareness. Your evolution.</p>
          </div>
          <Link
            href="/companion"
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[var(--color-border-glass)] px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            Check in
          </Link>
        </div>

        {justCompleted && (
          <div className="mb-4 bg-[var(--color-violet-900)]/40 border border-[var(--color-violet-600)]/40 rounded-2xl px-4 py-3">
            <p className="text-[var(--color-violet-400)] text-sm">✦ Decision mapped. Your reflection is saved.</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6">
            {/* My InnerSelf hero — the caption is the real roadmap theme, and
                the ring is the real Alignment Score (see below). This page
                has real users; unlike the dedicated Growth Tracker (Phase 5,
                still static demo data), nothing here is fabricated. */}
            <Card className="relative overflow-hidden !p-0">
              <div className="flex flex-col sm:flex-row">
                {/* Alignment Score — real, computed server-side from commitment
                    follow-through + confirmed value-signal clarity (see
                    DashboardResponseSchema's doc comment). Confidence-gated
                    (ADR 0011): only rendered as a number when
                    alignmentScoreState === 'eligible'; 'insufficient'/
                    'developing' get an honest qualitative state instead of
                    a fabricated or premature number. */}
                <div className="p-5 lg:p-6 sm:w-56 shrink-0 flex flex-col">
                  <p className="text-sm text-white/70">My InnerSelf</p>
                  <p className="text-xs text-white/40">Your Digital Twin</p>
                  <div className="mt-4">
                    {dashboard?.alignmentScoreState === 'eligible' && dashboard.alignmentScore != null ? (
                      <ProgressRing percent={dashboard.alignmentScore} size={84} colorClassName="stroke-[var(--color-violet-500)]">
                        <span className="text-lg font-medium text-white">{dashboard.alignmentScore}%</span>
                      </ProgressRing>
                    ) : (
                      <div className="w-[84px] h-[84px] rounded-full border-2 border-dashed border-white/15 flex items-center justify-center">
                        <span className="text-[10px] text-white/30 text-center px-2">
                          {dashboard?.alignmentScoreState === 'developing' ? 'Picture forming…' : 'Still learning this part of you'}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-2">Alignment Score</p>
                </div>

                <div className="relative h-40 sm:h-auto sm:flex-1">
                  <Image
                    src="/images/dashboard/inner-self-hero.webp"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    style={{ objectPosition: 'left center' }}
                    preload
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--color-bg-base)]" />
                  {dashboard?.roadmap && (
                    <div className="absolute inset-0 flex flex-col items-end justify-center text-right px-6 lg:px-10">
                      <p className="text-white/60 text-sm">You&apos;re in a phase of</p>
                      <p className="font-display text-xl lg:text-2xl text-[var(--color-amber-300)]">{dashboard.roadmap.theme}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* My Roadmap — real currentFocus/theme/direction, shared with
                Growth Tracker (Slice 4) via RoadmapTimelineCard. */}
            {dashboard?.roadmap && <RoadmapTimelineCard roadmap={dashboard.roadmap} />}

            {/* Intelligence Spec §17 — Roadmap Lifecycle state + the one
                genuinely new action (pause/resume/archive); everything else
                about the lifecycle just labels transitions that already
                happen elsewhere. Minimal by design — a label plus whichever
                one or two actions are actually valid from the current state,
                not a full lifecycle-management UI. */}
            {dashboard?.roadmap && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-white/40 capitalize">Roadmap: {dashboard.roadmap.lifecycleState}</span>
                <div className="flex gap-2">
                  {(dashboard.roadmap.lifecycleState === 'active' || dashboard.roadmap.lifecycleState === 'evolving') && (
                    <button
                      onClick={() => handleLifecycleAction('pause')}
                      disabled={lifecyclePending}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                    >
                      Pause
                    </button>
                  )}
                  {(dashboard.roadmap.lifecycleState === 'paused' || dashboard.roadmap.lifecycleState === 'archived') && (
                    <button
                      onClick={() => handleLifecycleAction('resume')}
                      disabled={lifecyclePending}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                    >
                      Resume
                    </button>
                  )}
                  {dashboard.roadmap.lifecycleState !== 'archived' && (
                    <button
                      onClick={() => handleLifecycleAction('archive')}
                      disabled={lifecyclePending}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Life Domains — real aggregate over confirmed, classified Twin
                signals (twin/classify_signal, Session 19). Only domains the
                person has actually explored appear; the list grows on its
                own as more signals get confirmed and classified — never
                padded to a fixed 7. */}
            {!loading && (dashboard?.lifeDomains?.length ?? 0) > 0 && (
              <Card>
                <p className="text-sm text-white mb-1">Life Domains</p>
                <p className="text-xs text-white/40 mb-4">What you&apos;ve been exploring</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dashboard!.lifeDomains.map((d) => (
                    <div key={d.domain} className="bg-white/5 rounded-xl px-3 py-2.5">
                      <p className="text-xs text-white/70 mb-1.5 line-clamp-1">{LIFE_DOMAIN_LABELS[d.domain]}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-amber-400)]"
                            style={{ width: `${d.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/40 shrink-0">{d.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {!loading && dashboard?.roadmapProposal && (
              <Card className="border-[var(--color-violet-600)]/40 bg-[var(--color-violet-900)]/20">
                <p className="text-[var(--color-violet-400)]/70 text-xs uppercase tracking-wide mb-2">A shift worth naming?</p>
                <p className="text-white/70 text-sm leading-relaxed mb-3">{dashboard.roadmapProposal.rationale}</p>
                <div className="space-y-1 mb-3">
                  <p className="text-white text-sm">{dashboard.roadmapProposal.currentFocus}</p>
                  <p className="text-white/50 text-xs">{dashboard.roadmapProposal.direction}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleProposalAction('accept')}
                    disabled={proposalPending}
                    className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors disabled:opacity-50"
                  >
                    Update my Roadmap
                  </button>
                  <button
                    onClick={() => handleProposalAction('reject')}
                    disabled={proposalPending}
                    className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Not now
                  </button>
                </div>
              </Card>
            )}

            {!loading && twin && (
              <TwinCalibrationCard
                signals={twin.signals}
                onSignalUpdated={(signalId, status) =>
                  setTwin((prev) =>
                    prev
                      ? { ...prev, signals: prev.signals.map((s) => (s.signalId === signalId ? { ...s, status } : s)) }
                      : prev
                  )
                }
              />
            )}

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40">Credits</p>
                  <p className="text-white text-lg font-light mt-0.5">{loading ? '…' : (dashboard?.creditsBalance ?? 0)}</p>
                </div>
                {!loading && dashboard?.creditsLow && (
                  <Link href="/pricing" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                    Running low · Upgrade
                  </Link>
                )}
              </div>
            </Card>

            {/* Patterns Track — real domain='pattern' Twin signals, ranked by
                confidence, using each signal's own real description. Not the
                reference's fixed Overthinking/Pleasing/Avoidance/Control
                labels (no classifier sorts signals into those buckets) —
                shows the person's own actual confirmed patterns instead. */}
            {!loading && confirmedPatterns.length > 0 && (
              <Card>
                <p className="text-sm text-white mb-1">Patterns Track</p>
                <p className="text-xs text-white/40 mb-4">What DPNR has noticed, by confidence</p>
                <div className="space-y-3">
                  {confirmedPatterns.slice(0, 4).map((signal) => (
                    <div key={signal.signalId}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-white/80 line-clamp-1 pr-2">{signal.description}</p>
                        <span className="text-xs text-white/40 shrink-0">{Math.round(signal.confidence * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)]"
                          style={{ width: `${Math.round(signal.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Leading Archetypes — real aggregate over confirmed, classified
                Twin signals, same classifier as Life Domains (Session 19).
                Only archetypes the person has actually shown evidence of
                appear. */}
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

            {/* My Evolution — real daily snapshots of the Alignment Score
                (snapshot-alignment-score.ts, scheduled daily). Short/sparse
                for any real user until enough days accumulate — that's
                honest, not padded with fabricated history. */}
            {!loading && (dashboard?.alignmentHistory?.length ?? 0) >= 2 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-white">My Evolution</p>
                  <span className="text-xs text-white/40">Last {dashboard!.alignmentHistory.length} days</span>
                </div>
                <AlignmentSparkline points={dashboard!.alignmentHistory} />
              </Card>
            )}

            {/* Explore — on desktop the sidebar already covers Chat/Mirror/
                Decision/Library/InnerSelf, so only what it doesn't cover
                (the combined Work Rooms hub) shows here. On mobile the
                bottom nav only has 5 slots, so Library + InnerSelf still
                need a way in. */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <ExploreTile href="/library" title="Library" subtitle="Read something" />
              <ExploreTile href="/growth" title="Growth Tracker" subtitle="What's changing" />
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
            {!loading && dashboard?.continuityCue?.kind === 'daily_card' && dailyCard && (
              <DailyGuidanceCard dailyCard={dailyCard} />
            )}

            {!loading && dashboard?.continuityCue && dashboard.continuityCue.kind !== 'daily_card' && (
              <Card className="relative overflow-hidden">
                <p className="text-sm text-white mb-3">{CUE_LABEL[dashboard.continuityCue.kind]}</p>
                <p className="text-white/70 text-sm leading-relaxed italic">&ldquo;{dashboard.continuityCue.text}&rdquo;</p>
                <Heart className="w-4 h-4 text-[var(--color-amber-400)] mt-3" />
              </Card>
            )}

            {suggestedSpace && ROOM_LINK[suggestedSpace] && (
              <Card>
                <p className="text-sm text-white mb-3">Suggested Next Step</p>
                <Link
                  href={ROOM_LINK[suggestedSpace].href}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-[var(--color-border-glass)] px-3 py-3 hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full border border-[var(--color-violet-500)]/50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[var(--color-violet-400)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white">{ROOM_LINK[suggestedSpace].label}</p>
                    <p className="text-xs text-white/40">{dashboard?.roadmap?.direction}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                </Link>
              </Card>
            )}

            <div className="hidden lg:grid gap-3">
              <ExploreTile href="/rooms" title="Work Rooms" subtitle="Decision · Mirror" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AlignmentSparkline({ points }: { points: { date: string; score: number }[] }) {
  const width = 280
  const height = 64
  const scores = points.map((p) => p.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p.score - min) / range) * height
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={coords.join(' ')} fill="none" stroke="var(--color-amber-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExploreTile({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="bg-white/5 border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-[var(--radius-card)] p-4 transition-all block"
    >
      <p className="text-white text-sm font-medium">{title}</p>
      <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>
    </Link>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-bg-base)]" />}>
      <DashboardContent />
    </Suspense>
  )
}
