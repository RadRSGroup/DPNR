'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import PrimaryButton from '@/components/ui/PrimaryButton'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import LotusIcon from '@/components/icons/LotusIcon'
import { getCompanionContext, getTwin, getMirrorsList } from '@/lib/api/v1-client'
import { ROOM_REFINE_COST } from '@dpnr/shared-types'
import type { CompanionContextResponse, TwinListResponse } from '@dpnr/shared-types'

interface Props {
  userName: string
  onStart: () => void
}

/**
 * Mirror Room's landing page — reskinned against the "Mirror Room" reference
 * screen (docs/AGENT_LOG.md Session 20/21, Phase 3), the same "room landing"
 * composition Decision Room's own landing already uses. Imports
 * Sidebar/MobileNav directly rather than moving `/mirror/new` under the
 * `(app)` layout group, for the same reason DecisionRoomLanding does — the
 * reflection wizard that follows (`MirrorStepShell` and every Step0N screen)
 * stays immersive and chrome-free.
 *
 * Two reference widgets were deliberately NOT built, for the same
 * "don't fabricate" reason DecisionRoomLanding's own handoff already
 * documents: "Start Your Reflection"'s three entry modes (By Pattern / By
 * Situation / Trigger Archetypes) don't correspond to three real distinct
 * flows — the backend command contract is one linear flow regardless of
 * entry point (`mirror-steps/*.ts`) — so building three buttons that all do
 * the exact same thing would imply functionality that doesn't exist; one
 * real "Start Mirror" CTA stays instead. The Active/Exploring/Resolved
 * status tabs on "Your Patterns" have no matching real status taxonomy
 * either.
 *
 * The reference's "Reflection Streak" (day-streak + "Inner Points") is
 * real data now that `GET /v1/rooms/mirrors` exists (Slice 1), but is
 * intentionally NOT reskinned as a streak — a per-user consistency
 * indicator ("You've shown up N times this week") replaces it instead, per
 * the project's own already-verified anti-addiction principle
 * (`docs/PHASE_AUDIT.md`): no points currency, no break-the-streak framing,
 * no public/comparative element. See `weeklySessionCount` below.
 *
 * "Your Patterns" itself IS real, though: it reuses the exact same confirmed
 * `domain==='pattern'` Twin signals, ranked by confidence, Dashboard's own
 * "Patterns Track" widget already shows — same data, same honesty, just
 * also surfaced here since Mirror Room is where those patterns get explored.
 */
export default function MirrorRoomLanding({ userName, onStart }: Props) {
  const router = useRouter()
  const firstName = userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0] || userName
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [twin, setTwin] = useState<TwinListResponse | null>(null)
  const [weeklySessionCount, setWeeklySessionCount] = useState<number | null>(null)

  useEffect(() => {
    getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {})
    getTwin().then(setTwin).catch(() => {})
    // Rolling 7-day window (not calendar week) — simpler than reasoning about
    // week boundaries/timezones, and "you've shown up N times this week"
    // reads the same either way for a private, non-comparative count.
    getMirrorsList()
      .then((res) => {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const count = res.mirrors.filter((m) => new Date(m.createdAt).getTime() >= weekAgo).length
        setWeeklySessionCount(count)
      })
      .catch(() => {})
  }, [])

  const confirmedPatterns = (twin?.signals ?? [])
    .filter((s) => s.domain === 'pattern' && s.status === 'confirmed')
    .sort((a, b) => b.confidence - a.confidence)

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">
        <div className="relative min-h-screen">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

          <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
            <div className="pt-14 lg:pt-8 pb-6">
              {firstName && <p className="text-[var(--color-violet-400)] text-xs uppercase tracking-widest mb-1">Welcome back, {firstName}</p>}
              <h1 className="font-display text-2xl lg:text-3xl text-white">Mirror Room</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Notice what this moment reveals within you. Breathe and begin.
              </p>
            </div>

            <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                <Card className="lg:flex lg:items-center lg:gap-8 !p-0 lg:!p-6 overflow-hidden">
                  <div className="relative h-64 lg:h-56 lg:w-56 lg:shrink-0 lg:rounded-[var(--radius-card)] overflow-hidden">
                    <Image
                      src="/images/mirror/mirror-room-hero.webp"
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 224px, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5 lg:p-0">
                    <h2 className="font-display text-xl lg:text-2xl text-white">Welcome to Mirror Room</h2>
                    <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-sm">
                      This is your space to pause, observe, and explore your inner patterns. The more you see, the more you&apos;re free to choose.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <PrimaryButton label="Start Mirror" onClick={onStart} className="lg:w-auto lg:px-6" />
                      <span className="text-white/30 text-xs">
                        {ROOM_REFINE_COST} credit{ROOM_REFINE_COST === 1 ? '' : 's'} per refine
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Side column */}
              <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
                {dailyCard && <DailyGuidanceCard dailyCard={dailyCard} title="Today's Insight" />}

                {/* Private, non-comparative consistency indicator — see the
                    file doc comment above for why this replaces the
                    reference's streak/points widget. Only shown once there's
                    something real to reflect; a "0 times this week" reading
                    would edge toward the break-the-streak framing this is
                    meant to avoid. */}
                {weeklySessionCount !== null && weeklySessionCount > 0 && (
                  <Card>
                    <p className="text-sm text-white">
                      You&apos;ve shown up {weeklySessionCount} time{weeklySessionCount === 1 ? '' : 's'} this week
                    </p>
                    <p className="text-xs text-white/40 mt-1">Just for you to notice — no pressure, no streak to break.</p>
                  </Card>
                )}

                {confirmedPatterns.length > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-1">
                      <LotusIcon className="w-4 h-4 text-[var(--color-violet-400)]" />
                      <p className="text-sm text-white">Your Patterns</p>
                    </div>
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
