'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Search, Telescope, Heart, Target, CheckCircle2, ArrowRight, ArrowRightCircle, Clock, PieChart, Plus, History, Layers } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import Card from '@/components/ui/Card'
import PrimaryButton from '@/components/ui/PrimaryButton'
import BottomSheet from '@/components/ui/BottomSheet'
import PullACard from '@/components/companion/PullACard'
import { getDailyCard, getDecisionsList } from '@/lib/api/v1-client'
import type { CompanionContextResponse, DecisionsListResponse } from '@dpnr/shared-types'
import { timeAgo } from '@/lib/format'

// Labels and copy: DecisionRoom.phases.{phase} and DecisionRoom.landing.journey.{key}.
const JOURNEY = [
  { key: 'define', phase: 1, icon: Search },
  { key: 'explore', phase: 2, icon: Telescope },
  { key: 'feel', phase: 3, icon: Heart },
  { key: 'align', phase: 4, icon: Target },
  { key: 'decide', phase: 5, icon: CheckCircle2 },
  { key: 'act', phase: 6, icon: ArrowRightCircle },
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
 * open yet). "Pull a New Card" opens the same Pull a Card in a sheet here
 * (founder feedback 2026-09-28 #19: it used to route to Main Chat and take
 * the person out of the room).
 */
export default function DecisionRoomLanding({ onStart, sourceTopicTitle }: Props) {
  const locale = useLocale()
  const t = useTranslations('DecisionRoom')
  const router = useRouter()
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [decisions, setDecisions] = useState<DecisionsListResponse['decisions']>([])
  const [optionsOverview, setOptionsOverview] = useState<DecisionsListResponse['optionsOverview']>(null)
  const [decisionsLoading, setDecisionsLoading] = useState(true)
  const [cardOpen, setCardOpen] = useState(false)
  // Tapped journey phase (touch equivalent of the desktop hover, #21).
  const [activePhase, setActivePhase] = useState<number | null>(null)

  useEffect(() => {
    getDailyCard().then(setDailyCard).catch(() => {
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
                  {t('roomLabel')}
                </h1>
                <p className="text-sm lg:text-base text-[var(--color-text-secondary)] mt-2">
                  {t('landing.subtitle')}
                </p>
                {sourceTopicTitle && <p className="text-xs text-purple-300/70 mt-2">{t('landing.exploring', { title: sourceTopicTitle })}</p>}
              </div>
              <button
                onClick={onStart}
                className="hidden lg:inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:border-white/40 bg-white/[0.03] px-5 py-3 text-sm text-white transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden /> {t('landing.newDecision')}
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
                    {/* Light through the trees (founder feedback 2026-09-28 #23): a warm glow
                        around the sun that breathes very slowly (opacity only, 5s, MOTION.md
                        soft-glow), plus a faint wash of light from above. Presence, not motion. */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-screen">
                      {/* Positioned on the photo's sun, which doesn't mirror in RTL. */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_34%,rgba(251,203,107,0.32)_0%,rgba(251,203,107,0.1)_14%,transparent_28%)] lg:bg-[radial-gradient(circle_at_58%_30%,rgba(251,203,107,0.32)_0%,rgba(251,203,107,0.1)_12%,transparent_24%)] animate-soft-glow" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,203,107,0.08)_0%,transparent_45%)] animate-soft-glow stagger-3" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r rtl:lg:bg-gradient-to-l from-[var(--color-bg-base)]/90 via-[var(--color-bg-base)]/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end lg:justify-center p-5 lg:p-12 lg:max-w-[52%]">
                      <h2 className="font-display text-2xl lg:text-4xl text-white leading-tight">{t('landing.heroTitle')}</h2>
                      <span aria-hidden className="hidden lg:block h-px w-52 my-5 bg-gradient-to-r rtl:bg-gradient-to-l from-transparent via-[var(--color-violet-400)] to-transparent" />
                      <p className="text-white/75 text-sm lg:text-base mt-2 lg:mt-0 max-w-sm leading-relaxed">
                        {t('landing.heroBody')}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="lg:px-7 lg:py-6">
                  <p className="text-white text-lg lg:text-xl">{t('landing.journeyTitle')}</p>
                  <p className="text-[var(--color-text-secondary)] text-sm lg:text-base mt-1 mb-5">{t('landing.journeySubtitle')}</p>
                  {/* #20/#21 (2026-09-28): phase copy readable (it was 11px), and a
                      restrained warm accent on hover (desktop) or tap/focus
                      (touch). The copy never outgrows the phase title. */}
                  <ol className="grid grid-cols-3 lg:grid-cols-6 gap-y-5">
                    {JOURNEY.map((j, i) => (
                      <li
                        key={j.key}
                        tabIndex={0}
                        onClick={() => setActivePhase((p) => (p === i ? null : i))}
                        aria-describedby={`journey-copy-${i}`}
                        className="group relative text-center px-1 rounded-2xl outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-amber-400)]/50 cursor-default"
                      >
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
                        <p className="text-white text-sm lg:text-base mt-1.5">{t(`phases.${j.phase}`)}</p>
                        <p
                          id={`journey-copy-${i}`}
                          className={`text-xs lg:text-[13px] mt-1 leading-snug hidden lg:block transition-colors lg:group-hover:text-[var(--color-amber-300)] lg:group-focus-visible:text-[var(--color-amber-300)] ${
                            activePhase === i ? 'text-[var(--color-amber-300)]' : 'text-white/60'
                          }`}
                        >
                          {t(`landing.journey.${j.key}`)}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {/* Phones have no room for six descriptions under the icons: the
                      tapped phase's copy shows here instead. */}
                  <p aria-live="polite" className="lg:hidden mt-4 min-h-[2.5rem] text-center text-sm leading-snug text-[var(--color-amber-300)]">
                    {activePhase !== null ? t(`landing.journey.${JOURNEY[activePhase].key}`) : <span className="text-white/45">{t('landing.tapPhase')}</span>}
                  </p>
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
                    <p className="text-[var(--color-violet-300)] text-sm mb-2">{t('landing.stepEyebrow')}</p>
                    <p className="font-display text-white text-2xl">{t('stepLabels.1')}</p>
                    <p className="text-white/65 text-sm mt-2 max-w-xs leading-relaxed">
                      {t('landing.stepBody')}
                    </p>
                  </div>
                  <div className="relative mt-5 lg:mt-0 flex flex-col items-start lg:items-center gap-3 shrink-0">
                    <button
                      onClick={onStart}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-6 py-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow-violet)] transition-colors"
                    >
                      {t('landing.start')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                    </button>
                    <p className="text-white/60 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {t('landing.duration')}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Side column — every widget always shows (Session 69), honest when empty. */}
              <div className="space-y-4 lg:space-y-6 mt-4 lg:mt-0">
                <Card className="lg:px-5">
                  <div className="flex items-center gap-2">
                    <p className="text-base text-white">{t('landing.recentTitle')}</p>
                    <History className="w-4 h-4 text-white/60" aria-hidden />
                  </div>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5 mb-3">{t('landing.recentSubtitle')}</p>
                  {decisionsLoading ? (
                    <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse" />
                  ) : recentDecisions.length === 0 ? (
                    <p className="text-[var(--color-text-tertiary)] text-xs">{t('landing.recentEmpty')}</p>
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
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-violet-300)]" /> {t('landing.completed')}
                              </>
                            ) : (
                              t('landing.inProgress')
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
                    <p className="text-base text-white">{t('landing.overviewTitle')}</p>
                  </div>
                  {decisionsLoading ? (
                    <span aria-hidden className="block h-3 w-2/3 rounded-full bg-white/[0.07] animate-soft-pulse mt-3" />
                  ) : optionsOverview ? (
                    <>
                      <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5 mb-4">
                        {t('landing.overviewAcross', { count: optionsOverview.totalWithLean })}
                      </p>
                      <div className="space-y-2">
                        <OverviewRow label={t('landing.leaning')} pct={optionsOverview.leaningTowardChoicePct} barClass="bg-[var(--color-violet-500)]" />
                        <OverviewRow label={t('landing.weighing')} pct={100 - optionsOverview.leaningTowardChoicePct} barClass="bg-[var(--color-violet-300)]/60" />
                      </div>
                    </>
                  ) : (
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-2">
                      {t('landing.overviewEmpty')}
                    </p>
                  )}
                </Card>

                <Card className="lg:px-5">
                  <p className="text-base text-white mb-3">{t('landing.guidanceTitle')}</p>
                  <div className="relative rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-4">
                    <span aria-hidden className="block font-display text-3xl leading-none text-[var(--color-violet-300)]">&ldquo;</span>
                    <p className="text-white/85 text-sm leading-relaxed mt-1">
                      {dailyCard ? dailyCard.text : t('landing.guidanceEmpty')}
                    </p>
                  </div>
                  <button
                    onClick={() => setCardOpen(true)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[var(--color-violet-600)]/20 hover:bg-[var(--color-violet-600)]/35 py-3 text-sm text-white/90 transition-colors"
                  >
                    <Layers className="w-4 h-4" /> {t('landing.pullCard')}
                  </button>
                </Card>

                <div className="lg:hidden">
                  <PrimaryButton label={t('landing.start')} onClick={onStart} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
      {cardOpen && (
        <BottomSheet onClose={() => setCardOpen(false)} closeLabel={t('close')}>
          <PullACard />
        </BottomSheet>
      )}
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
