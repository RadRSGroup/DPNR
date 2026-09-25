'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { useRoomSessionClock } from '@/components/shared/RoomSessionClock'

// "After sustained intensive reflection, offer to integrate, stop, or
// continue later" (spec §6). Threshold is a fraction of the room's own
// time budget — see the history in decision/StepShell.tsx (Session 8/22).
const STOPPING_CUE_FRACTION = 0.8

// Last step number shown per room, so a newly mounted step knows which way
// the person travelled (docs/MOTION.md). Each step is its own component, so
// this layout remounts on every step change and can't compare props.
// Module scope on purpose: it only has to outlive one step's unmount.
const lastStepShown: Record<string, number> = {}

export interface RoomStepLayoutProps {
  /** Shown in the top bar, e.g. "Mirror Room". */
  roomLabel: string
  backgroundSrc: string
  step: number
  totalSteps: number
  stepLabels: Record<number, string>
  stepInfo: Record<number, string>
  stepReflections: Record<number, string>
  title: string
  children: React.ReactNode
  onBack?: () => void
  onSkip?: () => void
  /** Starting time budget in minutes — the seed for a real countdown. */
  minutesLeft: number
}

/**
 * Shared step chrome for Decision Room and Mirror Room (Session 68). Both
 * rooms' shells used to be a copy of the same 393px phone frame, centred
 * on desktop with a rounded border — the rooms were effectively mobile-only
 * (user report). Mobile is unchanged: the same full-height column with
 * progress dots, a scrolling step body and back/next at the bottom.
 *
 * Desktop (lg) follows the designer's room references
 * (docs/reference-screens/platform_photos/refs/decision-welcome.png,
 * mirror-room-home-2.png — they only cover the room home screens, so the
 * step screens borrow their language): a display-font title, a labelled
 * step journey instead of dots, the step body in a wide glass card, and a
 * side column with "About this step" (was a "?" modal) and the reflection
 * line.
 */
export default function RoomStepLayout({
  roomLabel,
  backgroundSrc,
  step,
  totalSteps,
  stepLabels,
  stepInfo,
  stepReflections,
  title,
  children,
  onBack,
  onSkip,
  minutesLeft: initialMinutes,
}: RoomStepLayoutProps) {
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)
  // The room page's clock (RoomSessionClock), so the countdown and the
  // stopping cue carry across steps instead of restarting on each remount.
  const { elapsedSeconds, stoppingCueDismissed, dismissStoppingCue } = useRoomSessionClock()
  // Read once per mount (stable across Strict Mode's double render; the
  // effect below records the step only after it's committed).
  const [direction] = useState<'forward' | 'back' | 'none'>(() => {
    const last = lastStepShown[roomLabel]
    if (last === undefined || last === step) return 'none'
    return step > last ? 'forward' : 'back'
  })

  useEffect(() => {
    lastStepShown[roomLabel] = step
  }, [roomLabel, step])

  const minutesLeft = Math.max(0, initialMinutes - Math.floor(elapsedSeconds / 60))
  const showStoppingCue = !stoppingCueDismissed && elapsedSeconds >= initialMinutes * 60 * STOPPING_CUE_FRACTION
  const stepNumber = String(step).padStart(2, '0')
  // Before the person has named anything the title is a placeholder like
  // "…" — show the step's own name instead of empty quotes.
  const hasTitle = /\p{L}|\p{N}/u.test(title)

  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="relative isolate h-dvh flex flex-col bg-[var(--color-bg-base)] overflow-hidden max-w-[393px] mx-auto lg:h-auto lg:min-h-screen lg:max-w-none lg:overflow-visible">
          {/* Galaxy background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <Image src={backgroundSrc} alt="" fill sizes="100vw" className="object-cover lg:opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-14 pb-2 lg:px-10 lg:pt-8">
            <button
              onClick={() => router.push('/dashboard')}
              aria-label="Close"
              className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 lg:gap-3">
              <span className="text-[var(--color-text-tertiary)] text-xs lg:text-sm">{roomLabel}</span>
              <span className="text-[var(--color-text-tertiary)] text-xs lg:text-sm lg:rounded-full lg:border lg:border-white/15 lg:px-3 lg:py-1">
                {minutesLeft} min
              </span>
            </div>

            <button
              onClick={() => setInfoOpen(true)}
              aria-label="About this step"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 text-sm lg:invisible"
            >
              ?
            </button>
          </div>

          {/* Progress — dots on mobile, a labelled journey on desktop */}
          <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1 lg:hidden">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-(--motion-slow) origin-left rtl:origin-right ${
                  direction === 'forward' && i + 1 === step ? 'animate-journey-fill ' : ''
                }${
                  i + 1 < step
                    ? 'bg-[var(--color-violet-400)] w-5'
                    : i + 1 === step
                      ? 'bg-[var(--color-violet-400)] w-8 shadow-[var(--shadow-glow-violet)]'
                      : 'bg-white/15 w-4'
                }`}
              />
            ))}
          </div>

          {/* Title + step label */}
          <div className="text-center px-6 pt-4 pb-2 lg:text-start lg:px-10 lg:pt-6 lg:pb-0">
            <p className="hidden lg:block text-[var(--color-violet-300)] text-xs uppercase tracking-[0.2em]">
              Step {step} of {totalSteps}
            </p>
            <h2 className="text-white text-lg font-light lg:font-display lg:text-3xl lg:mt-2 lg:truncate">{hasTitle ? <>&quot;{title}&quot;</> : stepLabels[step]}</h2>
            <p className="text-white/50 text-xs mt-1 lg:hidden">
              Step {stepNumber}: {stepLabels[step]}
            </p>
          </div>

          <ol className="hidden lg:flex items-start px-10 pt-6 pb-8" aria-label="Steps">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const n = i + 1
              const state = n < step ? 'done' : n === step ? 'current' : 'todo'
              return (
                <li key={n} className="flex-1 flex flex-col items-center text-center relative min-w-0">
                  {n < totalSteps && (
                    <>
                      {/* The segment just completed draws in over its dashed track. */}
                      {direction === 'forward' && n === step - 1 && (
                        <span
                          aria-hidden
                          className="absolute top-5 start-[calc(50%+1.5rem)] end-[calc(-50%+1.5rem)] h-px border-t border-dashed border-white/15"
                        />
                      )}
                      <span
                        aria-hidden
                        className={`absolute top-5 start-[calc(50%+1.5rem)] end-[calc(-50%+1.5rem)] h-px ${
                          n < step ? 'bg-[var(--color-violet-400)]' : 'border-t border-dashed border-white/15'
                        } ${direction === 'forward' && n === step - 1 ? 'origin-left rtl:origin-right animate-journey-fill' : ''}`}
                      />
                    </>
                  )}
                  <span
                    aria-current={state === 'current' ? 'step' : undefined}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all ${
                      state === 'current'
                        ? 'bg-[var(--color-violet-600)]/40 border border-[var(--color-violet-400)] text-white shadow-[var(--shadow-glow-violet)]'
                        : state === 'done'
                          ? 'bg-[var(--color-violet-500)]/25 border border-[var(--color-violet-400)]/60 text-[var(--color-violet-200)]'
                          : 'border border-white/15 text-white/40'
                    }`}
                  >
                    {state === 'done' ? '✓' : n}
                  </span>
                  <span className={`mt-2 px-1 text-xs leading-snug ${state === 'current' ? 'text-white' : 'text-white/45'}`}>
                    {stepLabels[n]}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* Body: step card + (desktop) side column */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-none lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start lg:px-10 lg:pb-10">
            <div className="flex-1 min-h-0 flex flex-col lg:min-h-[520px] lg:rounded-3xl lg:border lg:border-white/12 lg:bg-white/[0.04] lg:backdrop-blur-xl lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-20px_rgba(0,0,0,0.6)] lg:p-8">
              {/* Only the content moves, never the glass card around it (MOTION.md). */}
              <div
                className={`scrollbar-glass flex-1 overflow-y-auto flex flex-col px-5 pb-4 lg:px-0 lg:overflow-visible ${
                  direction === 'back' ? 'animate-step-in-back' : direction === 'forward' ? 'animate-step-in-forward' : 'animate-settle-in'
                }`}
              >
                {children}
              </div>

              {/* A word from us — desktop shows it in the side column */}
              <div className="px-6 py-2 text-center lg:hidden">
                <p className="text-white/20 text-xs italic leading-relaxed">{stepReflections[step]}</p>
              </div>

              <div className="flex items-center justify-between px-5 pb-8 pt-2 lg:px-0 lg:pb-0 lg:pt-6 lg:mt-2 lg:border-t lg:border-white/10">
                <button
                  onClick={onBack}
                  disabled={!onBack}
                  className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all"
                  aria-label="Back"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
                    <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {onSkip ? (
                  <button
                    onClick={onSkip}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
                    aria-label="Next"
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
                      <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <div className="w-12 h-12" />
                )}
              </div>
            </div>

            <aside className="hidden lg:flex flex-col gap-4 sticky top-8">
              <div className="liquid-glass rounded-3xl p-6">
                <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-[0.2em]">
                  Step {stepNumber} · {stepLabels[step]}
                </p>
                <p className="font-display text-white text-lg mt-3">About this step</p>
                <p className="text-white/70 text-sm leading-relaxed mt-2">{stepInfo[step] ?? '—'}</p>
              </div>
              <div className="liquid-glass rounded-3xl p-6">
                <span aria-hidden className="block font-display text-4xl leading-none text-[var(--color-violet-300)]">&ldquo;</span>
                <p className="text-white/80 text-sm leading-relaxed italic mt-1">{stepReflections[step]}</p>
              </div>
              <p className="text-[var(--color-text-tertiary)] text-xs px-2 leading-relaxed">
                Everything you write is saved as you go — you can pause and come back any time.
              </p>
            </aside>
          </div>

          {/* Info modal (mobile — desktop shows the same text in the side column) */}
          {infoOpen && (
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 pb-8 px-5 lg:hidden"
              onClick={() => setInfoOpen(false)}
            >
              <div
                className="w-full bg-[var(--color-violet-900)] border border-[var(--color-violet-600)]/40 rounded-3xl p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-widest">
                    Step {stepNumber} · {stepLabels[step]}
                  </p>
                  <button
                    onClick={() => setInfoOpen(false)}
                    aria-label="Close"
                    className="text-[var(--color-text-tertiary)] hover:text-white/60 text-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{stepInfo[step] ?? '—'}</p>
              </div>
            </div>
          )}

          {/* Soft stopping cue (spec §6) */}
          {showStoppingCue && (
            <div className="absolute lg:fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 pb-8 px-5 lg:p-10">
              <div className="w-full lg:max-w-md bg-[var(--color-violet-900)] border border-[var(--color-violet-600)]/40 rounded-3xl p-6 space-y-4">
                <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-widest">A gentle check-in</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  You&apos;ve been with this for a while now. However you continue, what you&apos;ve already explored is
                  saved — nothing is lost by pausing here.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={dismissStoppingCue}
                    className="flex-1 py-3 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white text-sm font-medium transition-colors"
                  >
                    Keep going
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 py-3 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-sm transition-colors"
                  >
                    Pause, continue later
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
