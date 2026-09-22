'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Shared "Breathe & Check In" modal — MVP behind the two previously-dead
 * Check-In/Breathe buttons (dashboard/page.tsx, growth/page.tsx), which used
 * to be plain `Link`s to /companion and /mirror/new. Product-owner-approved
 * scope (see AGENT_LOG.md session that added this): one guided breath cycle
 * (~30-60s) plus an optional, single-tap "how are you feeling" chip row.
 *
 * The caller mounts this only while open (`{open && <CheckInModal .../>}`)
 * rather than passing an `open` prop — that way every open is a fresh mount
 * with fresh state, no "reset the breath cycle" effect needed on re-open.
 *
 * The mood chips are deliberately NOT wired to any backend — this codebase
 * has no generic mood/feeling check-in concept anywhere (grepped
 * infra/cdk/lambda and packages/shared-types: the only "mood"/"feeling"
 * hits are Mirror Room's own domain-specific step fields, e.g.
 * `energyMoodEffect` on a specific room session, not a standalone check-in).
 * Per this project's "no fabricated content" convention, tapping a chip does
 * NOT pretend to save anywhere — it only gives a brief local, in-modal
 * acknowledgment. A future session wiring this to a real endpoint should
 * replace `handleMoodTap` below, not the UI around it.
 */

const BREATH_PHASES = [
  { key: 'inhale', seconds: 4 },
  { key: 'hold', seconds: 4 },
  { key: 'exhale', seconds: 6 },
] as const

type PhaseKey = (typeof BREATH_PHASES)[number]['key']

const CYCLE_COUNT = 3 // 3 * 14s = 42s total — within the ~30-60s MVP window

const MOOD_KEYS = ['calm', 'anxious', 'tired', 'hopeful', 'stuck', 'okay'] as const

const PHASE_LABEL_KEY: Record<PhaseKey, string> = {
  inhale: 'breatheInLabel',
  hold: 'holdLabel',
  exhale: 'breatheOutLabel',
}

// Circle scale target per phase — grown/held at 1, contracted at rest.
const RESTING_SCALE = 0.75
const GROWN_SCALE = 1

export default function CheckInModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('CheckInModal')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  const [cycleIndex, setCycleIndex] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [circleScale, setCircleScale] = useState(RESTING_SCALE)

  const phase = BREATH_PHASES[phaseIndex]

  // Drive the breath cycle with a plain timeout chain — simplest thing that
  // reliably matches the CSS transition duration set per phase below.
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => {
      if (phaseIndex < BREATH_PHASES.length - 1) {
        setPhaseIndex(phaseIndex + 1)
      } else if (cycleIndex < CYCLE_COUNT - 1) {
        setCycleIndex(cycleIndex + 1)
        setPhaseIndex(0)
      } else {
        setRunning(false)
      }
    }, phase.seconds * 1000)
    return () => clearTimeout(timer)
  }, [running, phaseIndex, cycleIndex, phase.seconds])

  // Animate the circle toward this phase's target scale on the next frame,
  // so the CSS transition (duration = this phase's length) actually plays
  // rather than jumping straight to its end state.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setCircleScale(phase.key === 'exhale' ? RESTING_SCALE : GROWN_SCALE)
    })
    return () => cancelAnimationFrame(raf)
  }, [phaseIndex, cycleIndex, phase.key])

  // Focus trap + Escape-to-close + restore focus on unmount.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const container = dialogRef.current
      if (!container) return
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus()
    }
  }, [onClose])

  function handleMoodTap(mood: string) {
    // Local-only acknowledgment — see file header. Nothing is persisted.
    setSelectedMood(mood)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm liquid-glass bg-[var(--color-violet-900)] border border-white/10 rounded-3xl p-6 space-y-6 text-center"
      >
        <div className="flex items-center justify-between">
          <p className="text-[var(--color-violet-300)] text-xs uppercase tracking-widest">{t('title')}</p>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t('closeLabel')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_var(--color-violet-500)_0%,_var(--color-violet-600)_60%,_transparent_100%)] opacity-70"
              style={{
                transform: `scale(${circleScale})`,
                transition: `transform ${phase.seconds}s ease-in-out`,
              }}
            />
            <div
              className="absolute inset-4 rounded-full border border-white/20"
              style={{
                transform: `scale(${circleScale})`,
                transition: `transform ${phase.seconds}s ease-in-out`,
              }}
            />
          </div>
          <p className="text-white text-base font-medium min-h-6">
            {running ? t(PHASE_LABEL_KEY[phase.key]) : t('doneLabel')}
          </p>
          <p className="text-white/50 text-xs">{t('subtitle')}</p>
        </div>

        <div className="space-y-3">
          <p className="text-[var(--color-text-tertiary)] text-xs">{t('moodPrompt')}</p>
          {selectedMood ? (
            <p className="text-[var(--color-violet-300)] text-sm">{t('moodThanks')}</p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {MOOD_KEYS.map((mood) => (
                <button
                  key={mood}
                  onClick={() => handleMoodTap(mood)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:border-white/30 transition-colors"
                >
                  {t(`moods.${mood}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 text-xs transition-colors"
        >
          {t('skip')}
        </button>
      </div>
    </div>
  )
}
