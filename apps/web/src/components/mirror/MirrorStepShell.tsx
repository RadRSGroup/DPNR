'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TOTAL_STEPS = 6

interface MirrorStepShellProps {
  step: number
  sessionTitle: string
  children: React.ReactNode
  onBack?: () => void
  minutesLeft?: number
}

/**
 * Mirror Room's own step chrome — copied and adapted from
 * components/decision/StepShell.tsx rather than generalizing that
 * component directly, to avoid any risk of regressing Decision Room's
 * already live-verified UI (Session 8) for this first pass. Same visual
 * system (galaxy gradient, progress dots, quoted title, "a word from us"
 * reflection line) with Mirror Room's own 6-step labels/copy. No `onSkip`
 * prop — no Mirror Room step has a SKIP action (see mirror-steps/*.ts's
 * `allowedActions`), so there's nothing to bind a Skip button to.
 */
const STEP_LABELS: Record<number, string> = {
  1: 'The Situation',
  2: 'In the Moment',
  3: 'The Pattern',
  4: 'The Impact',
  5: 'Synthesis',
  6: 'Commitment',
}

const STEP_INFO: Record<number, string> = {
  1: 'Naming exactly what happened — without judgment — is the first step to seeing it clearly.',
  2: 'Your thought, feeling, body sensation, and reaction usually arrive together, faster than you can think. Slowing down to name each one separately is where insight starts.',
  3: 'How you coped afterward, and whether this keeps happening with the same people or situations, is often more revealing than the incident itself.',
  4: 'Every reaction ripples outward — into your energy, your mood, and the parts of your life it actually touches.',
  5: 'Seeing the whole arc reflected back can surface a thread you didn\'t consciously connect yourself.',
  6: 'A commitment only has to be small enough to actually happen.',
}

const STEP_REFLECTIONS: Record<number, string> = {
  1: 'What you name clearly, you can finally look at.',
  2: 'Your body often knows before your mind finds the words.',
  3: 'Patterns repeat until they\'re seen.',
  4: 'Nothing that affects you is really "just in your head."',
  5: 'Reflection is how experience becomes understanding.',
  6: 'A small, honest step is worth more than a perfect plan.',
}

export default function MirrorStepShell({
  step,
  sessionTitle,
  children,
  onBack,
  minutesLeft = 12,
}: MirrorStepShellProps) {
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)

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
          <span className="text-white/40 text-xs">Mirror Room</span>
          <span className="text-white/30 text-xs">{minutesLeft} min</span>
        </div>

        <button
          onClick={() => setInfoOpen(true)}
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

      {/* Session title + step label */}
      <div className="text-center px-6 pt-4 pb-2">
        <h2 className="text-white text-lg font-light">&quot;{sessionTitle}&quot;</h2>
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
        <div className="w-12 h-12" />
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
    </div>
  )
}
