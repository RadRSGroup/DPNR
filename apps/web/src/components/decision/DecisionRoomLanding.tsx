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
import { getCompanionContext } from '@/lib/api/v1-client'
import type { CompanionContextResponse } from '@dpnr/shared-types'

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
 * The reference's "Recent Decisions" and "Options Overview" widgets have no
 * real backend (no `GET /v1/decisions` list exists — the same honest gap
 * Dashboard's own port already flagged for its dropped decision-history
 * section). Recent Decisions renders an honest empty state instead of
 * fabricated rows; Options Overview is omitted rather than shown with
 * invented percentages. "Today's Guidance" reuses the real Daily Card
 * (`GET /v1/companion/context`) — same data Companion's own widget shows.
 */
export default function DecisionRoomLanding({ userName, onStart }: Props) {
  const router = useRouter()
  const firstName = userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0] || userName
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)

  useEffect(() => {
    getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {
      // Honest degrade — the guidance card just doesn't render.
    })
  }, [])

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

          <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
            <div className="pt-14 lg:pt-8 pb-6 flex items-center justify-between">
              <div>
                {firstName && <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-widest mb-1">Welcome back, {firstName}</p>}
                <h1 className="font-display text-2xl lg:text-3xl text-white">Decision Room</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Make aligned choices with clarity and confidence.
                </p>
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
                  <p className="text-white/40 text-xs mb-4">A simple process to move from confusion to clarity.</p>
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
                          <j.icon className={`w-4 h-4 ${i === 0 ? 'text-[var(--color-violet-400)]' : 'text-white/40'}`} />
                        </div>
                        <p className="text-white text-xs font-medium">{j.label}</p>
                        <p className="text-white/30 text-[10px] mt-0.5 leading-snug hidden lg:block">{j.copy}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="lg:flex lg:items-center lg:justify-between lg:gap-6">
                  <div>
                    <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-wide mb-2">Step 1 of 7</p>
                    <p className="text-white text-base font-medium">Name the Decision</p>
                    <p className="text-white/40 text-sm mt-1 max-w-md">
                      Let&apos;s start by getting clear on what this decision is really about.
                    </p>
                    <p className="text-white/30 text-xs mt-2 flex items-center gap-1.5">
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
                  <p className="text-white/30 text-xs">
                    Once you complete a decision here, it&apos;ll show up in this list.
                  </p>
                </Card>

                {dailyCard && <DailyGuidanceCard dailyCard={dailyCard} />}

                <div className="lg:hidden">
                  <PrimaryButton label="Start Step 1" onClick={onStart} />
                </div>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full text-center text-white/40 hover:text-white/60 text-xs underline"
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
