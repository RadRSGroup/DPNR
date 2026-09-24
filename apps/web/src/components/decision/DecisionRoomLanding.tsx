'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import { Search, Telescope, Heart, Target, CheckCircle2, ArrowRight, ArrowRightCircle, Clock, PieChart, Plus, History, Layers } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import PrimaryButton from '@/components/ui/PrimaryButton'
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
 * list endpoint existed. Options Overview now has a real backend
 * (`DecisionsListResponse.optionsOverview`, same response as Recent
 * Decisions — see list-decisions.ts's own doc comment) — reframed honestly
 * rather than reproducing the reference's illustrative 60/40 split verbatim,
 * since the underlying signal is an AI-inferred lean, not a firm commitment;
 * see `DecisionOptionsOverviewSchema`'s doc comment for the full reasoning.
 * "Today's Guidance" reuses the real Daily Card (`GET /v1/companion/context`)
 * — same data Companion's own widget shows.
 *
 * Session 69: restyled to the designer's reference
 * (docs/reference-screens/platform_photos/refs/decision-welcome.png) — hero
 * text on the start side, larger journey nodes with numbers and connectors,
 * the step card with lotus art, and every side widget always shown with an
 * honest empty state (user decision). Differences kept on purpose: the step
 * card says "Step 1 of 7 · Name the Decision" (the real flow has 7 steps;
 * the reference's "1 of 6 · Define" mixes the 6 journey phases with steps);
 * Recent Decisions shows real status, not the reference's progress bar and
 * "Aligned" (no per-decision progress or alignment value exists); Options
 * Overview keeps its honest lean-based labels (see above); the "…" menu and
 * "View all decisions" / "See full breakdown" links are left out (nothing to
 * open yet); "Pull a New Card" opens Main Chat, where Pull a Card lives.
 */
export default function DecisionRoomLanding({ onStart, sourceTopicTitle }: Props) {
  const locale = useLocale()
  const router = useRouter()
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [decisions, setDecisions] = useState<DecisionsListResponse['decisions']>([])
  const [optionsOverview, setOptionsOverview] = useState<DecisionsListResponse['optionsOverview']>(null)
  const [decisionsLoading, setDecisionsLoading] = useState(true)

  useEffect(() => {
    getCompanionContext().then((c) => setDailyCard(c.dailyCard)).catch(() => {
      // Honest degrade — the guidance card just doesn't render.
    })
    getDecisionsList()
      .then((r) => {
        setDecisions(r.decisions)
        setOptionsOverview(r.optionsOverview)
      })
      .catch(() => {
        // Honest degrade — falls through to the same empty-state copy a genuinely-empty list shows.
      })
      .finally(() => setDecisionsLoading(false))
  }, [])

  const recentDecisions = decisions.slice(0, 3)

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <div className="relative isolate min-h-screen">
          <div className="absolute inset-0 -z-10">
            <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
          </div>

          <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
            <div className="pt-14 lg:pt-8 pb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl lg:text-4xl text-white">
                  Decision Room
                </h1>
                <p className="text-sm lg:text-base text-[var(--color-text-secondary)] mt-2">
                  Make aligned choices with clarity and confidence.
                </p>
                {sourceTopicTitle && <p className="text-xs text-purple-300/70 mt-2">Exploring: {sourceTopicTitle}</p>}
              </div>
              <button
                onClick={onStart}
                className="hidden lg:inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:border-white/40 bg-white/[0.03] px-5 py-3 text-sm text-white transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden /> New Decision
              </button>
            </div>

            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
              {/* Main column */}
              <div className="space-y-4 lg:space-y-6 min-w-0">
                {/* Hero: text on the start side over a darkened edge, like the reference. */}
                <Card className="relative overflow-hidden !p-0">
                  <div className="relative h-64 lg:h-[340px]">
                    <Image
                      src="/images/decision/decision-room-hero.webp"
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 66vw, 100vw"
                      className="object-cover object-[70%_center]"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r rtl:lg:bg-gradient-to-l from-[var(--color-bg-base)]/90 via-[var(--color-bg-base)]/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end lg:justify-center p-5 lg:p-12 lg:max-w-[52%]">
                      <h2 className="font-display text-2xl lg:text-4xl text-white leading-tight">Welcome to Your Decision Room</h2>
                      <span aria-hidden className="hidden lg:block h-px w-52 my-5 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent via-[var(--color-violet-400)] to-transparent" />
                      <p className="text-white/75 text-sm lg:text-base mt-2 lg:mt-0 max-w-sm leading-relaxed">
                        A space to get clear, explore deeply, and choose what truly aligns with you.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="lg:px-7 lg:py-6">
                  <p className="text-white text-base lg:text-lg">Your Decision Journey</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs lg:text-sm mt-1 mb-5">A simple process to move from confusion to clarity.</p>
                  <ol className="grid grid-cols-3 lg:grid-cols-6 gap-y-5">
                    {JOURNEY.map((j, i) => (
                      <li key={j.label} className="relative text-center px-1">
                        {i < JOURNEY.length - 1 && (
                          <span
                            aria-hidden
                            className={`hidden lg:block absolute top-7 start-[calc(50%+2.25rem)] end-[calc(-50%+2.25rem)] ${
                              i === 0 ? 'h-0.5 bg-gradient-to-r rtl:bg-gradient-to-l from-[var(--color-violet-400)] to-transparent' : 'border-t border-dotted border-white/25'
                            }`}
                          />
                        )}
                        <div
                          className={`w-14 h-14 mx-auto rounded-full border flex items-center justify-center ${
                            i === 0
                              ? 'border-[var(--color-violet-400)] bg-[var(--color-violet-600)]/30 shadow-[var(--shadow-glow-violet)]'
                              : 'border-white/20'
                          }`}
                        >
                          <j.icon className={`w-6 h-6 ${i === 0 ? 'text-white' : 'text-white/70'}`} strokeWidth={1.5} />
                        </div>
                        <span
                          className={`inline-flex mt-3 w-5 h-5 rounded-full items-center justify-center text-[10px] ${
                            i === 0 ? 'bg-[var(--color-violet-500)] text-white' : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <p className="text-white text-sm mt-1.5">{j.label}</p>
                        <p className="text-[var(--color-text-tertiary)] text-[11px] mt-1 leading-snug hidden lg:block">{j.copy}</p>
                      </li>
                    ))}
                  </ol>
                </Card>

                <Card className="relative overflow-hidden lg:flex lg:items-center lg:justify-between lg:gap-6 lg:px-8 lg:py-7">
                  <Image
                    src="/images/decision/lotus-violet.webp"
                    alt=""
                    width={420}
                    height={286}
                    className="hidden md:block absolute start-1/2 top-1/2 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 opacity-60 mix-blend-screen pointer-events-none [mask-image:radial-gradient(ellipse,black_35%,transparent_70%)]"
                  />
                  <div className="relative">
                    <p className="text-[var(--color-violet-300)] text-sm mb-2">Step 1 of 7</p>
                    <p className="font-display text-white text-2xl">Name the Decision</p>
                    <p className="text-white/65 text-sm mt-2 max-w-xs leading-relaxed">
                      Let&apos;s start by getting clear on what this decision is really about.
                    </p>
                  </div>
                  <div className="relative mt-5 lg:mt-0 flex flex-col items-start lg:items-center gap-3 shrink-0">
                    <button
                      onClick={onStart}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-6 py-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow-violet)] transition-colors"
                    >
                      Start Step 1 <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                    </button>
                    <p className="text-white/60 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Takes about 25 minutes
                    </p>
                  </div>
                </Card>
              </div>

              {/* Side column — every widget always shows (Session 69), honest when empty. */}
              <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
                <Card className="lg:px-5">
                  <div className="flex items-center gap-2">
                    <p className="text-base text-white">Recent Decisions</p>
                    <History className="w-4 h-4 text-white/60" aria-hidden />
                  </div>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5 mb-3">Your past decisions</p>
                  {decisionsLoading ? (
                    <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse" />
                  ) : recentDecisions.length === 0 ? (
                    <p className="text-[var(--color-text-tertiary)] text-xs">Once you start a decision here, it&apos;ll show up in this list.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentDecisions.map((d) => (
                        <button
                          key={d.decisionId}
                          onClick={() => router.push(`/decision/${d.decisionId}`)}
                          className="w-full rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] px-3 py-2.5 transition-colors text-start"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-white/90 line-clamp-1">{d.title}</p>
                            <span className="text-[11px] text-[var(--color-text-tertiary)] shrink-0">{timeAgo(d.createdAt, locale)}</span>
                          </div>
                          <p className="mt-1.5 text-[11px] flex items-center gap-1 text-white/60">
                            {d.status === 'completed' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-violet-300)]" /> Completed
                              </>
                            ) : (
                              'In progress'
                            )}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="lg:px-5">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[var(--color-violet-300)]" />
                    <p className="text-base text-white">Options Overview</p>
                  </div>
                  {decisionsLoading ? (
                    <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse mt-3" />
                  ) : optionsOverview ? (
                    <>
                      <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5 mb-4">
                        Across {optionsOverview.totalWithLean} decision{optionsOverview.totalWithLean === 1 ? '' : 's'} that reached Future Projection
                      </p>
                      <div className="space-y-2">
                        <OverviewRow label="Leaning toward an option" pct={optionsOverview.leaningTowardChoicePct} barClass="bg-[var(--color-violet-500)]" />
                        <OverviewRow label="Still weighing both" pct={100 - optionsOverview.leaningTowardChoicePct} barClass="bg-[var(--color-violet-300)]/60" />
                      </div>
                    </>
                  ) : (
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-2">
                      This fills in once a decision reaches Future Projection (step 7).
                    </p>
                  )}
                </Card>

                <Card className="lg:px-5">
                  <p className="text-base text-white mb-3">Today&apos;s Guidance</p>
                  <div className="relative rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4">
                    <span aria-hidden className="block font-display text-3xl leading-none text-[var(--color-violet-300)]">&ldquo;</span>
                    <p className="text-white/85 text-sm leading-relaxed mt-1">
                      {dailyCard ? dailyCard.text : 'Your daily guidance arrives after a conversation or two.'}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/companion')}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-violet-600)]/20 hover:bg-[var(--color-violet-600)]/35 py-3 text-sm text-white/90 transition-colors"
                  >
                    <Layers className="w-4 h-4" /> Pull a New Card
                  </button>
                </Card>

                <div className="lg:hidden">
                  <PrimaryButton label="Start Step 1" onClick={onStart} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

function OverviewRow({ label, pct, barClass }: { label: string; pct: number; barClass: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-white/85">{label}</span>
        <span className="text-white/85">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
