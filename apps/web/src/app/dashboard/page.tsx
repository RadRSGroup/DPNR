'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getDashboard, acceptRoadmapProposal, rejectRoadmapProposal } from '@/lib/api/v1-client'
import type { DashboardResponse } from '@dpnr/shared-types'

// This page previously listed every past decision via the old Supabase
// `getDecisions()` query — dropped in this rewrite onto the real
// `GET /v1/dashboard` (docs/PHASE_AUDIT.md §4.6), which has no equivalent
// "list my decisions" field in its contract. An honest gap, not a silent
// regression: a future session adding a real decision-history read should
// restore this rather than reinventing it from Dashboard's own aggregate.

const CUE_ICON: Record<NonNullable<DashboardResponse['continuityCue']>['kind'], string> = {
  daily_card: '✦',
  continuation: '↩',
  commitment: '◆',
  roadmap_cue: '◈',
  recommended_space: '◈',
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const justCompleted = params.get('completed') === 'true'

  const [userInitial, setUserInitial] = useState('?')
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [proposalPending, setProposalPending] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        setUserInitial(email?.[0]?.toUpperCase() ?? '?')

        const data = await getDashboard()
        setDashboard(data)
      } catch {
        // silently degrade — the page below already handles a null dashboard
      } finally {
        setLoading(false)
      }
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

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-white text-xl font-light">InnerOS</h1>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-yellow-400 border border-yellow-400/40 rounded-full px-2 py-0.5">Beta</span>
          </div>
        </div>
        <Link
          href="/account"
          className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-700/40 flex items-center justify-center text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
          title="Account settings"
        >
          {userInitial}
        </Link>
      </div>

      {justCompleted && (
        <div className="mb-4 bg-purple-900/40 border border-purple-600/40 rounded-2xl px-4 py-3">
          <p className="text-purple-300 text-sm">✦ Decision mapped. Your reflection is saved.</p>
        </div>
      )}

      {/* Continuity cue — the single most-relevant thing to surface right
          now, per spec §2 Golden Path B step 3. Priority order (today's
          Daily Card, then an upcoming commitment, then a roadmap-suggested
          space) is decided server-side (dashboard/handler.ts); this just
          renders whichever one came back, or nothing at all. */}
      {!loading && dashboard?.continuityCue && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3">
          <span className="text-lg flex-shrink-0">{CUE_ICON[dashboard.continuityCue.kind]}</span>
          <p className="text-white/80 text-sm leading-relaxed">{dashboard.continuityCue.text}</p>
        </div>
      )}

      {/* Credits — replaces the retired per-tier token-usage bar
          (MVP_ARCHITECTURE.md §5.3's migration table: tier caps → Credits
          ledger). Session 11 built the real ledger; this is its first
          frontend reader. */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40">Credits</p>
          <p className="text-white text-lg font-light mt-0.5">
            {loading ? '…' : (dashboard?.creditsBalance ?? 0)}
          </p>
        </div>
        {!loading && dashboard?.creditsLow && (
          <Link href="/pricing" className="text-purple-400 hover:text-purple-300 text-xs underline">
            Running low · Upgrade
          </Link>
        )}
      </div>

      {/* Roadmap — always null today (nothing generates one yet, see
          docs/PHASE_AUDIT.md §4.6); an honest empty state beats inventing
          content. Render real content the moment onboarding produces one —
          no shape change needed here. */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Your Roadmap</p>
        {dashboard?.roadmap ? (
          <div className="space-y-1">
            <p className="text-white text-sm">{dashboard.roadmap.currentFocus}</p>
            <p className="text-white/50 text-xs">{dashboard.roadmap.direction}</p>
          </div>
        ) : (
          <p className="text-white/30 text-sm">
            Your Roadmap will appear here once DPNR has enough to work with.
          </p>
        )}
      </div>

      {/* A pending Roadmap revision (Session 16) — spec §5 Trust rules,
          extended to the Roadmap itself at the user's direct instruction:
          propose, never silently rewrite. Generated by roadmap/revise right
          after a Twin signal is confirmed; only becomes the live Roadmap
          once explicitly accepted here. */}
      {!loading && dashboard?.roadmapProposal && (
        <div className="mb-6 bg-purple-900/20 border border-purple-700/40 rounded-2xl p-4">
          <p className="text-purple-300/70 text-xs uppercase tracking-wide mb-2">A shift worth naming?</p>
          <p className="text-white/70 text-sm leading-relaxed mb-3">{dashboard.roadmapProposal.rationale}</p>
          <div className="space-y-1 mb-3">
            <p className="text-white text-sm">{dashboard.roadmapProposal.currentFocus}</p>
            <p className="text-white/50 text-xs">{dashboard.roadmapProposal.direction}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleProposalAction('accept')}
              disabled={proposalPending}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50"
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
        </div>
      )}

      {/* Direct access to the wider platform — spec §2 Golden Path B step 4:
          "Companion, Dashboard, My Evolution Map, Mirror Room, Decision
          Room and Library directly accessible... Dashboard is the primary
          navigation hub." Work Rooms groups Decision + Mirror Room (both
          Rooms) behind one tile rather than listing each here directly. */}
      <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Explore</p>
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/companion"
          className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-4 transition-all"
        >
          <p className="text-white text-sm font-medium">Companion</p>
          <p className="text-white/40 text-xs mt-0.5">Talk it through</p>
        </Link>
        <Link
          href="/rooms"
          className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-4 transition-all"
        >
          <p className="text-white text-sm font-medium">Work Rooms</p>
          <p className="text-white/40 text-xs mt-0.5">Decision · Mirror</p>
        </Link>
        <Link
          href="/twin"
          className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-4 transition-all"
        >
          <p className="text-white text-sm font-medium">InnerSelf</p>
          <p className="text-white/40 text-xs mt-0.5">What we&apos;ve learned</p>
        </Link>
        <Link
          href="/library"
          className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-4 transition-all"
        >
          <p className="text-white text-sm font-medium">Library</p>
          <p className="text-white/40 text-xs mt-0.5">Read something</p>
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <DashboardContent />
    </Suspense>
  )
}
