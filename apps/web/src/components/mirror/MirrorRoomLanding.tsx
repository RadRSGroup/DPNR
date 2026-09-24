'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowRight, Check, Heart, Plus } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import LotusIcon from '@/components/icons/LotusIcon'
import { getCompanionContext, getTwin, getMirrorsList } from '@/lib/api/v1-client'
import { ROOM_REFINE_COST } from '@dpnr/shared-types'
import type { CompanionContextResponse, TwinListResponse } from '@dpnr/shared-types'
import type { MirrorOpening } from './openings'

interface Props {
  userName: string
  onStart: (opening: MirrorOpening) => void
  /** Intelligence Spec §18/Appendix B — set when arriving via a Library topic's "Explore in Mirror Room" action. */
  sourceTopicTitle?: string | null
}

/**
 * Mirror Room's landing, laid out like the designer's reference
 * (docs/reference-screens/platform_photos/refs/mirror-room-home-2.png),
 * Session 69. Imports Sidebar/MobileNav directly rather than living under
 * the `(app)` layout group, so the reflection wizard that follows stays
 * immersive (same as DecisionRoomLanding).
 *
 * User decisions (Session 69), and where they differ from the reference:
 * - Every widget always shows, honest when empty (no hiding).
 * - "Reflection Streak" becomes a private week view: M–S circles ticked for
 *   days with a real Mirror session, a count for this week and in total. No
 *   day-streak, no points, no break-the-streak framing (the project's
 *   anti-addiction principle, docs/PHASE_AUDIT.md).
 * - "Start Your Reflection"'s three modes start the same single Mirror flow
 *   with a different opening (openings.ts); nothing on the backend differs.
 * - "Your Patterns" shows the person's own Twin pattern signals in the
 *   reference's row design: Active = confirmed, Exploring = noticed but not
 *   yet confirmed. No "Resolved" tab (no such state exists) and no "5/7
 *   days" frequency (no per-day pattern data exists) — bar = confidence.
 * Left out with reason: the reference's top bar (Focus Mode player, session
 * timer, help) belongs to an active session, not the landing.
 */
const INSIGHTS = [
  'Awareness is the first step. Choice is the next.',
  'What you notice, you can begin to change.',
  'A pattern seen clearly loses some of its hold.',
  'Pause. The reaction is not the whole of you.',
  'Curiosity is gentler than judgement, and it sees more.',
]

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const PATTERN_ORBS = ['/images/mirror/pattern-orb-1.webp', '/images/mirror/pattern-orb-2.webp', '/images/mirror/pattern-orb-3.webp', '/images/mirror/pattern-orb-4.webp']

function startOfWeek(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)) // Monday
  return s
}

export default function MirrorRoomLanding({ onStart, sourceTopicTitle }: Props) {
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [twin, setTwin] = useState<TwinListResponse | null>(null)
  const [sessionDates, setSessionDates] = useState<Date[] | null>(null)
  const [tab, setTab] = useState<'confirmed' | 'candidate'>('confirmed')

  useEffect(() => {
    getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {})
    getTwin().then(setTwin).catch(() => {})
    getMirrorsList()
      .then((res) => setSessionDates(res.mirrors.map((m) => new Date(m.createdAt))))
      .catch(() => setSessionDates([]))
  }, [])

  const patterns = (twin?.signals ?? [])
    .filter((s) => s.domain === 'pattern' && s.status === tab)
    .sort((a, b) => b.confidence - a.confidence)
  const topConfirmed = (twin?.signals ?? [])
    .filter((s) => s.domain === 'pattern' && s.status === 'confirmed')
    .sort((a, b) => b.confidence - a.confidence)[0]

  const now = new Date()
  const weekStart = startOfWeek(now)
  const todayIndex = (now.getDay() + 6) % 7
  const daysWithSession = new Set(
    (sessionDates ?? []).filter((d) => d >= weekStart).map((d) => (d.getDay() + 6) % 7)
  )
  const thisWeek = (sessionDates ?? []).filter((d) => d >= weekStart).length
  const insight = dailyCard?.text ?? INSIGHTS[Math.floor(now.getTime() / 86_400_000) % INSIGHTS.length]

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <div className="relative isolate min-h-screen">
          <div className="absolute inset-0 -z-10">
            <Image src="/images/backgrounds/mirror-bg.webp" alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
          </div>

          <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
            <div className="pt-14 lg:pt-10 pb-6">
              <h1 className="font-display text-3xl lg:text-4xl text-white">
                Mirror Room
              </h1>
              <p className="text-sm lg:text-base text-white/80 mt-3 leading-relaxed">
                Notice what this moment reveals within you.
                <br />
                Breathe and begin.
              </p>
              {sourceTopicTitle && <p className="text-xs text-purple-300/70 mt-2">Exploring: {sourceTopicTitle}</p>}
            </div>

            {/* Top row: welcome card | Today's Insight + week view */}
            <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-stretch">
              <Card className="relative overflow-hidden !p-0">
                <div className="flex flex-col sm:flex-row h-full">
                  <div className="relative h-56 sm:h-auto sm:min-h-80 sm:w-1/2 shrink-0">
                    <Image
                      src="/images/mirror/mirror-room-hero.webp"
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 28vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div className="flex flex-col justify-center p-5 lg:p-8 sm:w-1/2">
                    <h2 className="font-display text-2xl lg:text-3xl text-white leading-tight">Welcome to Mirror Room</h2>
                    <p className="text-white/70 text-sm mt-3 leading-relaxed">
                      This is your space to pause, observe, and explore your inner patterns. The more you see, the more you&apos;re free to choose.
                    </p>
                    <div className="h-px bg-white/10 my-6" />
                    <button
                      onClick={() => onStart({ mode: 'situation' })}
                      className="self-start inline-flex items-center gap-3 rounded-full bg-white/95 hover:bg-white text-[var(--color-violet-950)] ps-5 pe-2 py-2 font-medium transition-colors"
                    >
                      <LotusIcon className="w-5 h-5 text-[var(--color-violet-600)]" />
                      Start Mirror
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-violet-500)]/15 text-[var(--color-violet-600)] text-xs px-2.5 py-1"
                        title={`${ROOM_REFINE_COST} credit${ROOM_REFINE_COST === 1 ? '' : 's'} per refine`}
                      >
                        <LotusIcon className="w-3.5 h-3.5" /> {ROOM_REFINE_COST}
                      </span>
                    </button>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-2">
                      {ROOM_REFINE_COST} credit{ROOM_REFINE_COST === 1 ? '' : 's'} per refine
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 lg:gap-6">
                {/* Today's Insight — today's real Daily Card when there is one,
                    otherwise a short reflective line (fixed product copy,
                    rotating daily; not presented as personal). */}
                <Card className="relative overflow-hidden lg:px-7 lg:py-6">
                  <Image
                    src="/images/mirror/lotus-line.webp"
                    alt=""
                    width={150}
                    height={150}
                    className="absolute end-4 top-1/2 -translate-y-1/2 opacity-80 mix-blend-screen pointer-events-none hidden sm:block [mask-image:radial-gradient(circle,black_45%,transparent_72%)]"
                  />
                  <p className="font-display text-xl text-white">Today&apos;s Insight</p>
                  <span aria-hidden className="block font-display text-4xl leading-none text-[var(--color-magenta-500)] mt-3">&ldquo;</span>
                  <p className="text-white/85 text-sm leading-relaxed sm:max-w-[60%] mt-1">{insight}</p>
                  <button
                    onClick={() => onStart({ mode: 'situation' })}
                    className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--color-magenta-500)] hover:text-pink-300 transition-colors"
                  >
                    Keep reflecting <Heart className="w-4 h-4" />
                  </button>
                </Card>

                {/* Private week view (replaces the reference's streak/points). */}
                <Card className="lg:px-7 lg:py-6">
                  <p className="font-display text-xl text-white">Your Week</p>
                  <p className="text-sm text-white/70 mt-1">Just for you to notice. No streak to keep.</p>
                  <div className="flex justify-between gap-1 mt-5 max-w-md">
                    {WEEKDAYS.map((label, i) => {
                      const done = daysWithSession.has(i)
                      const today = i === todayIndex
                      return (
                        <span key={i} className="relative">
                          <span
                            className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full border flex items-center justify-center text-xs ${
                              today
                                ? 'border-[var(--color-amber-400)] text-[var(--color-amber-300)] shadow-[0_0_12px_-2px_var(--color-amber-400)]'
                                : 'border-white/15 text-white/70'
                            }`}
                          >
                            {label}
                          </span>
                          {done && (
                            <span className="absolute -bottom-1.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                    {sessionDates === null ? (
                      <span aria-hidden className="block h-3 w-1/2 rounded-full bg-white/[0.07] animate-soft-pulse" />
                    ) : thisWeek > 0 ? (
                      <p className="flex items-baseline gap-2">
                        <span className="text-3xl font-light text-white">{thisWeek}</span>
                        <span className="text-sm text-white/70">{thisWeek === 1 ? 'reflection' : 'reflections'} this week</span>
                      </p>
                    ) : (
                      <p className="text-sm text-white/70">Your first reflection this week is here whenever you&apos;re ready.</p>
                    )}
                    {sessionDates !== null && sessionDates.length > 0 && (
                      <p className="flex items-center gap-2 text-sm text-white/70 shrink-0">
                        <LotusIcon className="w-5 h-5 text-[var(--color-violet-300)]" />
                        {sessionDates.length} in total
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>

            {/* Bottom row: Start Your Reflection | Your Patterns */}
            <div className="grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-stretch mt-4 lg:mt-6">
              <Card className="lg:px-6 lg:py-6">
                <p className="font-display text-xl text-white">Start Your Reflection</p>
                <p className="text-sm text-white/70 mt-1">Choose how you want to look within.</p>
                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  <ModeCard
                    orb="/images/mirror/orb-pattern.webp"
                    title="By Pattern"
                    text={topConfirmed ? 'Start from a pattern you keep noticing.' : 'Start from a pattern — confirm one first on your Dashboard.'}
                    onClick={() => onStart(topConfirmed ? { mode: 'pattern', patternText: topConfirmed.description } : { mode: 'situation' })}
                  />
                  <ModeCard
                    orb="/images/mirror/orb-situation.webp"
                    title="By Situation"
                    text="Reflect on a current situation or recent experience."
                    onClick={() => onStart({ mode: 'situation' })}
                  />
                  <ModeCard
                    orb="/images/mirror/orb-archetype.webp"
                    title="Trigger Archetypes"
                    text="Notice which part of you takes over when you're triggered."
                    onClick={() => onStart({ mode: 'archetype' })}
                  />
                </div>
              </Card>

              <Card className="lg:px-6 lg:py-6 flex flex-col">
                <p className="font-display text-xl text-white">Your Patterns</p>
                <p className="text-sm text-white/70 mt-1">See clearly. Understand deeply. Choose differently.</p>
                <div className="flex gap-2 mt-4" role="tablist">
                  {(['confirmed', 'candidate'] as const).map((k) => (
                    <button
                      key={k}
                      role="tab"
                      aria-selected={tab === k}
                      onClick={() => setTab(k)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        tab === k ? 'bg-[var(--color-violet-600)]/40 text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {k === 'confirmed' ? 'Active Patterns' : 'Exploring'}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex-1">
                  {twin === null ? (
                    <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse mt-3" />
                  ) : patterns.length > 0 ? (
                    <ul className="divide-y divide-white/[0.06]">
                      {patterns.slice(0, 4).map((p, i) => {
                        const pct = Math.round(p.confidence * 100)
                        return (
                          <li key={p.signalId} className="flex items-center gap-3 py-2.5">
                            <span className="relative w-10 h-10 shrink-0">
                              <Image src={PATTERN_ORBS[i % PATTERN_ORBS.length]} alt="" fill sizes="40px" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white truncate">{p.description}</p>
                                <span className="shrink-0 rounded-full bg-[var(--color-violet-600)]/30 text-[var(--color-violet-200)] text-[10px] px-2 py-0.5">
                                  {tab === 'confirmed' ? 'Active' : 'Exploring'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden max-w-48">
                                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-violet-500)] to-[var(--color-magenta-500)]" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[11px] text-[var(--color-text-tertiary)]">{pct}%</span>
                              </div>
                            </div>
                            <button
                              onClick={() => onStart({ mode: 'pattern', patternText: p.description })}
                              aria-label={`Explore: ${p.description}`}
                              className="w-8 h-8 shrink-0 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 transition-colors"
                            >
                              <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
                      {tab === 'confirmed'
                        ? 'Patterns show up here once you confirm the ones DPNR notices (on your Dashboard).'
                        : 'Nothing new noticed right now. Patterns DPNR picks up from your sessions appear here first.'}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onStart({ mode: 'situation' })}
                  className="mt-4 self-center inline-flex items-center gap-2 text-sm text-[var(--color-violet-300)] hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" /> Explore something new
                </button>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

function ModeCard({ orb, title, text, onClick }: { orb: string; title: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-start rounded-2xl border border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07] transition-colors p-4 flex flex-col"
    >
      <span className="relative w-14 h-14">
        <Image src={orb} alt="" fill sizes="56px" />
      </span>
      <p className="text-white text-base mt-4">{title}</p>
      <p className="text-white/60 text-xs leading-relaxed mt-1.5 flex-1">{text}</p>
      <span className="mt-4 self-end w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center text-white/70 transition-colors">
        <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
      </span>
    </button>
  )
}
