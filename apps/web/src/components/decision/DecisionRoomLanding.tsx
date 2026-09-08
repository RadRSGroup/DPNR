'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Search, Telescope, Heart, Target, CheckCircle2, ArrowRightCircle, Clock } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import PrimaryButton from '@/components/ui/PrimaryButton'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import { getCompanionContext, getDecisionsList } from '@/lib/api/v1-client'
import type { CompanionContextResponse, DecisionsListResponse } from '@dpnr/shared-types'
import { timeAgo } from '@/lib/format'

const JOURNEY = [
  { label: 'Define', icon: Search, copy: 'Get clear on what this decision is really about.' },
  { label: 'Explore', icon: Telescope, copy: 'Look at all perspectives, options and possibilities.' },
  { label: 'Feel', icon: Heart, copy: 'Tune into your body, emotions and inner knowing.' },
  { label: 'Align', icon: Target, copy: 'Check what truly matters and what feels aligned.' },
  { label: 'Decide', icon: CheckCircle2, copy: 'Choose with confidence and inner peace.' },
  { label: 'Act', icon: ArrowRightCircle, copy: 'Create your next aligned action.' },
]

interface Props {
  userName: string
  onStart: () => void
  /** Intelligence Spec §18/Appendix B — set when arriving via a Library topic's "Explore in Decision Room" action. */
  sourceTopicTitle?: string | null
}

/**
 * Decision Room's landing page — reskinned against the "Decision Room"
 * reference screen (docs/AGENT_LOG.md Session 20, Phase 2). Renders directly
 * inside the (non-`(app)`-grouped) /decision/new route, importing
 * Sidebar/MobileNav itself rather than moving the route under the shared
 * `(app)` layout group — the step wizard that follows (StepShell and every
 * Step0N screen) is a deliberately immersive, chrome-free flow, and wrapping
 * the whole route in the shared shell would put the sidebar/mobile-nav
 * around that too.
 *
 * Recent Decisions reuses `GET /v1/rooms/decisions` (the same summary list
 * Growth Tracker's own "Recent Decisions" card already consumes) — this used
 * to render a hardcoded empty state under a since-corrected claim that no
 * list endpoint existed. Options Overview (choices-made / choices-explored
 * percentages) still has no real backend to draw from, so it stays omitted
 * rather than shown with invented numbers. "Today's Guidance" reuses the
 * real Daily Card (`GET /v1/companion/context`) — same data Companion's own
 * widget shows.
 */
export default function DecisionRoomLanding({ userName, onStart, sourceTopicTitle }: Props) {
  const router = useRouter()
  const firstName = userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0] || userName
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [decisions, setDecisions] = useState<DecisionsListResponse['decisions']>([])
  const [decisionsLoading, setDecisionsLoading] = useState(true)

  useEffect(() => {
    getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {
      // Honest degrade — the guidance card just doesn't render.
    })
    getDecisionsList()
      .then((r) => setDecisions(r.decisions))
      .catch(() => {
        // Honest degrade — falls through to the same empty-state copy a genuinely-empty list shows.
      })
      .finally(() => setDecisionsLoading(false))
  }, [])

  const recentDecisions = decisions.slice(0, 3)

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

          <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
            <div className="pt-14 lg:pt-8 pb-6 flex items-center justify-between">
              <div>
                {firstName && <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-widest mb-1">Welcome back, {firstName}</p>}
                <h1 className="font-display text-2xl lg:text-3xl text-white">Decision Room</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Make aligned choices with clarity and confidence.
                </p>
                {sourceTopicTitle && (
                  <p className="text-xs text-purple-300/70 mt-2">Exploring: {sourceTopicTitle}</p>
                )}
              </div>
              <button
                onClick={onStart}
                className="hidden lg:inline-flex items-center gap-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-4 py-2 text-sm text-white transition-colors"
              >
                + New Decision
              </button>
            </div>

            <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                <Card className="relative overflow-hidden !p-0">
                  <div className="relative h-56 lg:h-72">
                    <Image
                      src="/images/decision/decision-room-hero.webp"
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-transparent to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-start justify-end p-5 lg:p-8">
                      <h2 className="font-display text-xl lg:text-2xl text-white">Welcome to Your Decision Room</h2>
                      <p className="text-white/60 text-sm mt-1 max-w-sm">
                        A space to get clear, explore deeply, and choose what truly aligns with you.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <p className="text-white text-sm mb-1">Your Decision Journey</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mb-4">A simple process to move from confusion to clarity.</p>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {JOURNEY.map((j, i) => (
                      <div key={j.label} className="text-center">
                        <div
                          className={`w-10 h-10 mx-auto rounded-full border flex items-center justify-center mb-2 ${
                            i === 0
                              ? 'border-[var(--color-violet-500)] shadow-[var(--shadow-glow-violet)]'
                              : 'border-white/15'
                          }`}
                        >
                          <j.icon className={`w-4 h-4 ${i === 0 ? 'text-[var(--color-violet-400)]' : 'text-[var(--color-text-tertiary)]'}`} />
                        </div>
                        <p className="text-white text-xs font-medium">{j.label}</p>
                        <p className="text-[var(--color-text-tertiary)] text-[10px] mt-0.5 leading-snug hidden lg:block">{j.copy}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="lg:flex lg:items-center lg:justify-between lg:gap-6">
                  <div>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Step 1 of 7</p>
                    <p className="text-white text-base font-medium">Name the Decision</p>
                    <p className="text-[var(--color-text-tertiary)] text-sm mt-1 max-w-md">
                      Let&apos;s start by getting clear on what this decision is really about.
                    </p>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Takes about 25 minutes
                    </p>
                  </div>
                  <button
                    onClick={onStart}
                    className="mt-4 lg:mt-0 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-5 py-3 text-sm font-medium text-white transition-colors shrink-0"
                  >
                    Start Step 1 →
                  </button>
                </Card>
              </div>

              {/* Side column */}
              <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
                <Card>
                  <p className="text-sm text-white mb-1">Recent Decisions</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mb-3">Your past decisions</p>
                  {decisionsLoading ? (
                    <p className="text-[var(--color-text-tertiary)] text-xs">Loading…</p>
                  ) : recentDecisions.length === 0 ? (
                    <p className="text-[var(--color-text-tertiary)] text-xs">
                      Once you complete a decision here, it&apos;ll show up in this list.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {recentDecisions.map((d) => (
                        <button
                          key={d.decisionId}
                          onClick={() => router.push(`/decision/${d.decisionId}`)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl -mx-2 px-2 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white/80 line-clamp-1">{d.title}</p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">{timeAgo(d.createdAt)}</p>
                          </div>
                          <span className="text-xs text-[var(--color-text-tertiary)] capitalize shrink-0">{d.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {dailyCard && <DailyGuidanceCard dailyCard={dailyCard} />}

                <div className="lg:hidden">
                  <PrimaryButton label="Start Step 1" onClick={onStart} />
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-center text-[var(--color-text-tertiary)] hover:text-white/60 text-xs underline"
                >
                  Back to InnerOS
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
