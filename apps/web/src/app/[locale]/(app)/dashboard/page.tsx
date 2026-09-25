'use client'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, Compass, Plus } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import {
  getDashboard,
  getTwin,
  getCompanionContext,
  acceptRoadmapProposal,
  rejectRoadmapProposal,
  updateRoadmapLifecycle,
  getPreferences,
} from '@/lib/api/v1-client'
import { displayFirstName } from '@/lib/displayName'
import type { DashboardResponse, TwinListResponse, CompanionContextResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import RoadmapTimelineCard from '@/components/shared/RoadmapTimelineCard'
import TwinCalibrationCard from '@/components/shared/TwinCalibrationCard'
import CheckInModal from '@/components/shared/CheckInModal'
import AccountMenu from '@/components/layout/AccountMenu'
import PullACard from '@/components/companion/PullACard'
import InnerSelfHero from '@/components/dashboard/InnerSelfHero'
import LifeDomainsCarousel from '@/components/dashboard/LifeDomainsCarousel'
import PatternsTrackCard from '@/components/dashboard/PatternsTrackCard'
import ArchetypesCard from '@/components/dashboard/ArchetypesCard'
import EvolutionCard from '@/components/dashboard/EvolutionCard'
import InsightCard from '@/components/dashboard/InsightCard'

const ROOM_LINK: Record<'decision' | 'mirror' | 'library', { href: string; labelKey: string }> = {
  decision: { href: '/decision/new', labelKey: 'decision' },
  mirror: { href: '/mirror/new', labelKey: 'mirror' },
  library: { href: '/library', labelKey: 'library' },
}

// This page previously listed every past decision via the old Supabase
// `getDecisions()` query — dropped in this rewrite onto the real
// `GET /v1/dashboard` (docs/PHASE_AUDIT.md §4.6), which has no equivalent
// "list my decisions" field in its contract. An honest gap, not a silent
// regression: a future session adding a real decision-history read should
// restore this rather than reinventing it from Dashboard's own aggregate.

function DashboardContent() {
  const t = useTranslations('Dashboard')
  const tc = useTranslations('Companion')
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
  const [checkInOpen, setCheckInOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        setFirstName(displayFirstName(null, email))
        // The profile's own name (Session 70), best-effort — the email-derived
        // one above stays if this fails or none is set.
        getPreferences()
          .then((p) => {
            if (p.firstName) setFirstName(p.firstName)
          })
          .catch(() => {})

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

  const hour = new Date().getHours()
  const greeting = tc(hour < 12 ? 'greeting.morning' : hour < 18 ? 'greeting.afternoon' : 'greeting.evening')
  const cueText = dashboard?.continuityCue && dashboard.continuityCue.kind !== 'daily_card' ? dashboard.continuityCue.text : null
  const roadmap = dashboard?.roadmap ?? null

  const lifecycleActions = roadmap && (
    <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
      <span>{t('roadmap.label', { state: t(`roadmap.states.${roadmap.lifecycleState}`) })}</span>
      {(roadmap.lifecycleState === 'active' || roadmap.lifecycleState === 'evolving') && (
        <button onClick={() => handleLifecycleAction('pause')} disabled={lifecyclePending} className="hover:text-white/70 transition-colors disabled:opacity-50">
          {t('roadmap.pause')}
        </button>
      )}
      {(roadmap.lifecycleState === 'paused' || roadmap.lifecycleState === 'archived') && (
        <button onClick={() => handleLifecycleAction('resume')} disabled={lifecyclePending} className="hover:text-white/70 transition-colors disabled:opacity-50">
          {t('roadmap.resume')}
        </button>
      )}
      {roadmap.lifecycleState !== 'archived' && (
        <button onClick={() => handleLifecycleAction('archive')} disabled={lifecyclePending} className="hover:text-white/70 transition-colors disabled:opacity-50">
          {t('roadmap.archive')}
        </button>
      )}
    </div>
  )

  // Layout follows the designer's Dashboard reference
  // (docs/reference-screens/platform_photos/refs/dashboard.png, Session 69):
  // main column (InnerSelf hero, Roadmap, Life Domains, then Patterns /
  // Archetypes / Evolution) + a side column (Today's Insight, Suggested Next
  // Step, Daily Card). User decision: every widget is always shown, with an
  // honest empty state instead of hiding — nothing here is fabricated.
  // Not in the reference, kept on purpose: the Roadmap proposal and Twin
  // calibration cards (they appear only when there's something to act on;
  // confirming signals is what fills Life Domains/Patterns/Archetypes).
  // Left out of the reference with reason: the notification bell (no
  // notifications exist) and a 4th "Intention" Roadmap node (no such field).
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/dashboard-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-7 pb-5 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl lg:text-4xl text-white">
              {greeting}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-sm lg:text-base text-[var(--color-text-secondary)] mt-1">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => setCheckInOpen(true)}
            className="hidden lg:inline-flex items-center gap-2 rounded-full border border-[var(--color-amber-400)]/70 px-5 py-2.5 text-sm text-white/90 hover:bg-[var(--color-amber-400)]/10 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden />
            {t('checkIn')}
          </button>
          <div className="hidden lg:block">
            <AccountMenu />
          </div>
        </div>

        {checkInOpen && <CheckInModal onClose={() => setCheckInOpen(false)} />}

        {justCompleted && (
          <div className="mb-4 bg-[var(--color-violet-900)]/40 border border-[var(--color-violet-600)]/40 rounded-2xl px-4 py-3">
            <p className="text-[var(--color-violet-400)] text-sm">{t('justCompleted')}</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px] lg:gap-6 lg:items-start">
          {/* Main column */}
          <div className="space-y-4 lg:space-y-5 min-w-0">
            <InnerSelfHero dashboard={dashboard} loading={loading} />

            <RoadmapTimelineCard roadmap={roadmap} actions={lifecycleActions} loading={loading} />

            {!loading && dashboard?.roadmapProposal && (
              <Card className="border-[var(--color-violet-600)]/40 bg-[var(--color-violet-900)]/20">
                <p className="text-[var(--color-violet-400)]/70 text-xs uppercase tracking-wide mb-2">{t('proposal.title')}</p>
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
                    {t('proposal.updateRoadmap')}
                  </button>
                  <button
                    onClick={() => handleProposalAction('reject')}
                    disabled={proposalPending}
                    className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {t('proposal.notNow')}
                  </button>
                </div>
              </Card>
            )}

            <LifeDomainsCarousel lifeDomains={dashboard?.lifeDomains ?? []} loading={loading} />

            <div className="grid gap-4 lg:gap-5 md:grid-cols-2 2xl:grid-cols-3">
              <PatternsTrackCard patterns={confirmedPatterns} theme={roadmap?.theme ?? null} loading={loading} />
              <ArchetypesCard archetypes={dashboard?.archetypes ?? []} loading={loading} />
              <EvolutionCard history={dashboard?.alignmentHistory ?? []} loading={loading} />
            </div>

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

            {!loading && dashboard?.creditsLow && (
              <Card className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {t('credits.label')} · <span className="text-white">{dashboard.creditsBalance}</span>
                </p>
                <Link href="/pricing" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                  {t('credits.runningLowUpgrade')}
                </Link>
              </Card>
            )}

            {/* Mobile only: the bottom nav has 5 slots, so Library + Growth need a way in. */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <ExploreTile href="/library" title={t('explore.library.title')} subtitle={t('explore.library.subtitle')} />
              <ExploreTile href="/growth" title={t('explore.growth.title')} subtitle={t('explore.growth.subtitle')} />
            </div>
          </div>

          {/* Side column */}
          <div className="space-y-4 lg:space-y-5 mt-4 lg:mt-0">
            <InsightCard key={dailyCard?.text ?? 'none'} dailyCard={dailyCard} cueText={cueText} loading={loading} />

            <Card className="lg:px-5">
              <p className="text-white text-base lg:text-lg mb-3">{t('suggestedNextStep')}</p>
              <Link
                href={suggestedSpace && ROOM_LINK[suggestedSpace] ? ROOM_LINK[suggestedSpace].href : '/companion'}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.04] border border-[var(--color-border-glass)] px-3 py-3 hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full border border-[var(--color-violet-500)]/60 shadow-[0_0_12px_-2px_var(--color-violet-500)] flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 text-[var(--color-violet-300)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    {suggestedSpace && ROOM_LINK[suggestedSpace] ? t(`roomLink.${ROOM_LINK[suggestedSpace].labelKey}`) : t('suggested.defaultTitle')}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                    {suggestedSpace && ROOM_LINK[suggestedSpace] ? roadmap?.direction : t('suggested.defaultSubtitle')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] rtl:-scale-x-100 shrink-0" />
              </Link>
            </Card>

            <Card className="lg:px-5">
              <p className="text-white text-base lg:text-lg">{t('dailyCard.title')}</p>
              <p className="text-xs text-[var(--color-violet-300)]/80 mt-0.5 mb-3">{t('dailyCard.subtitle')}</p>
              <PullACard />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExploreTile({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <Link
      href={href}
      className="bg-white/5 border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-[var(--radius-card)] p-4 transition-all block"
    >
      <p className="text-white text-sm font-medium">{title}</p>
      <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{subtitle}</p>
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
