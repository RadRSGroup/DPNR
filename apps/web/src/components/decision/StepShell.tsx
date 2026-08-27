'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { STEP_LABELS, TOTAL_STEPS } from '@/lib/types'

interface StepShellProps {
  step: number
  decisionTitle: string
  children: React.ReactNode
  onBack?: () => void
  onSkip?: () => void
  /** Starting time budget in minutes — was a static display value with no
   * countdown at all (docs/PHASE_AUDIT.md's own "real gap, newly found").
   * Now the seed for a real client-side countdown; 25 matches
   * DecisionRoomLanding's own "Takes about 25 minutes" copy. */
  minutesLeft?: number
}

// "After sustained intensive reflection, offer to integrate, stop, or
// continue later" (spec §6). Every step already persists as it's
// submitted, so "stop" and "continue later" are the same real action —
// this deliberately doesn't invent a third, distinct "integrate" button
// with no behavior of its own to be distinct with (same reasoning Mirror
// Room's own landing page already applies to its three reference entry
// modes that all resolve to one real flow).
//
// Threshold is 80% of the room's own time budget, not one fixed absolute
// — a flat 20 minutes (this room's own budget) would almost never fire
// for Mirror Room's much shorter ~12-minute sessions. 80% of 25 gives
// Decision Room the same ~20-minute mark either way.
const STOPPING_CUE_FRACTION = 0.8

// The "?" info button used to call an AI `step_info` prompt (apps/web-only,
// pre-/v1 port). No step in the 14-step command contract implements an
// equivalent action — it was an orphaned Prompt Registry entry with nothing
// in decision-steps/*.ts ever resolving it. Rather than call a dead route,
// this is now static copy per step; revisit if a real backend equivalent
// ever exists.
const STEP_INFO: Record<number, string> = {
  1: 'Naming your decision clearly is the first step toward making it with intention rather than reacting to it.',
  2: 'Writing out both real options — even roughly — turns a foggy dilemma into something you can actually compare.',
  3: 'Emotions often show up in the body before the mind can name them. Noticing where helps you trust what you\'re feeling.',
  4: 'Different lenses surface different truths. Pick the one that matches what feels most alive in this decision right now.',
  5: 'Sit with each option honestly — the goal isn\'t to talk yourself into one, it\'s to see both clearly.',
  6: 'Values and needs are usually what a decision is really about, underneath the practical details.',
  7: 'Imagining a year ahead helps surface a gut sense of direction that pure logic sometimes misses.',
  8: 'This is a chance to see the whole shape of what you explored, before moving toward a next step.',
  9: 'An outside reflection of your own process can surface a thread you didn\'t consciously connect yourself.',
  10: 'A next step only has to be small enough to actually happen — momentum matters more than size.',
}

const STEP_REFLECTIONS: Record<number, string> = {
  1: 'Naming what you\'re carrying is the first act of clarity.',
  2: 'Every decision holds two truths — this step helps you see both.',
  3: 'Your body often knows what your mind is still working out.',
  4: 'The lens you choose shapes what becomes visible.',
  5: 'Looking closely at each path — without rushing — is wisdom.',
  6: 'What you value most is the compass behind every real choice.',
  7: 'Imagining forward helps you feel which path is truly yours.',
  8: 'Seeing the whole picture helps you understand what you truly know.',
  9: 'What you discovered here belongs to you — carry it with care.',
  10: 'A small step taken with intention is worth more than a leap taken in fear.',
}

export default function StepShell({
  step,
  decisionTitle,
  children,
  onBack,
  onSkip,
  minutesLeft: initialMinutes = 25,
}: StepShellProps) {
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [stoppingCueDismissed, setStoppingCueDismissed] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const minutesLeft = Math.max(0, initialMinutes - Math.floor(elapsedSeconds / 60))
  const showStoppingCue = !stoppingCueDismissed && elapsedSeconds >= initialMinutes * 60 * STOPPING_CUE_FRACTION

  function handleInfo() {
    setInfoOpen(true)
  }

  return (
    <div className="relative h-dvh flex flex-col bg-[var(--color-bg-base)] overflow-hidden max-w-[393px] mx-auto">
      {/* Galaxy background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[var(--color-violet-500)]/40 flex items-center justify-center text-xs">
            ✦
          </div>
          <span className="text-white/40 text-xs">Manifest yo...</span>
          <span className="text-white/30 text-xs">{minutesLeft} min</span>
        </div>

        <button
          onClick={handleInfo}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 text-sm"
        >
          ?
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i + 1 < step
                ? 'bg-[var(--color-violet-400)] w-5'
                : i + 1 === step
                ? 'bg-[var(--color-violet-400)] w-8 shadow-[var(--shadow-glow-violet)]'
                : 'bg-white/15 w-4'
            }`}
          />
        ))}
      </div>

      {/* Decision title + step label */}
      <div className="text-center px-6 pt-4 pb-2">
        <h2 className="text-white text-lg font-light">&quot;{decisionTitle}&quot;</h2>
        <p className="text-white/50 text-xs mt-1">
          Step {String(step).padStart(2, '0')}: {STEP_LABELS[step]}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto flex flex-col px-5 pb-4 fade-up">
        {children}
      </div>

      {/* A word from us */}
      <div className="px-6 py-2 text-center">
        <p className="text-white/20 text-xs italic leading-relaxed">{STEP_REFLECTIONS[step]}</p>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-5 pb-8 pt-2">
        <button
          onClick={onBack}
          disabled={!onBack}
          className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 disabled:opacity-20 transition-all"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {onSkip ? (
          <button
            onClick={onSkip}
            className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
            aria-label="Next"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
      </div>

      {/* Info modal */}
      {infoOpen && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 pb-8 px-5"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="w-full bg-[var(--color-violet-900)] border border-[var(--color-violet-600)]/40 rounded-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-widest">
                Step {String(step).padStart(2, '0')} · {STEP_LABELS[step]}
              </p>
              <button
                onClick={() => setInfoOpen(false)}
                className="text-white/30 hover:text-white/60 text-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{STEP_INFO[step] ?? '—'}</p>
          </div>
        </div>
      )}

      {/* Soft stopping cue (spec §6) — first real implementation, was
          entirely absent before. */}
      {showStoppingCue && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center z-50 pb-8 px-5">
          <div className="w-full bg-[var(--color-violet-900)] border border-[var(--color-violet-600)]/40 rounded-3xl p-6 space-y-4">
            <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-widest">A gentle check-in</p>
            <p className="text-white/70 text-sm leading-relaxed">
              You&apos;ve been in this for a while now. However you continue, what you&apos;ve already explored is
              saved — nothing is lost by pausing here.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStoppingCueDismissed(true)}
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
  )
}
