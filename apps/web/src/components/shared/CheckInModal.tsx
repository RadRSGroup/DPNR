'use client'
import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
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
 *
 * Motion (docs/MOTION.md, Session 69): the whole exercise is ONE Web
 * Animations API animation on the circle (BREATH_PHASES → keyframes, so the
 * rhythm lives only here). Its `currentTime` is the clock: the phase label,
 * the progress ring and the breath counter are all read from it every frame,
 * so they can't drift from the circle, and pause/resume is just
 * `animation.pause()` / `.play()`. The halo is a second animation with the
 * same timing, paused/played together. Under prefers-reduced-motion the
 * circle and halo hold still (constant keyframes, same clock) and the ring +
 * labels carry the timing on their own.
 */

// `color`: each phase's arc on the progress ring (user request, Session 69) —
// the three brand-gradient colors, so the ring also tells you where you are.
const BREATH_PHASES = [
  { key: 'inhale', seconds: 4, color: 'var(--color-violet-300)' },
  { key: 'hold', seconds: 4, color: 'var(--color-amber-300)' },
  { key: 'exhale', seconds: 6, color: 'var(--color-magenta-500)' },
] as const

type PhaseKey = (typeof BREATH_PHASES)[number]['key']

const CYCLE_COUNT = 3 // 3 * 14s = 42s total — within the ~30-60s MVP window (rhythm user-confirmed, Session 69)

const CYCLE_MS = BREATH_PHASES.reduce((sum, p) => sum + p.seconds, 0) * 1000

// Where each phase ends, as a fraction of one cycle: [4/14, 8/14, 1].
const PHASE_ENDS = BREATH_PHASES.reduce<number[]>((ends, p) => {
  ends.push((ends.at(-1) ?? 0) + (p.seconds * 1000) / CYCLE_MS)
  return ends
}, [])

const MOOD_KEYS = ['calm', 'anxious', 'tired', 'hopeful', 'stuck', 'okay'] as const

const PHASE_LABEL_KEY: Record<PhaseKey, string> = {
  inhale: 'breatheInLabel',
  hold: 'holdLabel',
  exhale: 'breatheOutLabel',
}

const RESTING_SCALE = 0.72
const GROWN_SCALE = 1
const STILL_SCALE = 0.88 // reduced motion: one comfortable in-between size

// Same curve as `--ease-breath` in globals.css (read at runtime, this is the fallback).
const BREATH_EASE_FALLBACK = 'cubic-bezier(0.37, 0, 0.63, 1)'

// Progress ring geometry (SVG viewBox 0 0 100 100).
const RING_R = 47
const RING_C = 2 * Math.PI * RING_R
const RING_GAP = 1.6 // gap between the three phase segments of the track

function phaseIndexAt(fraction: number): number {
  const i = PHASE_ENDS.findIndex((end) => fraction < end)
  return i === -1 ? BREATH_PHASES.length - 1 : i
}

function circleKeyframes(ease: string, reduced: boolean): Keyframe[] {
  if (reduced) return [{ transform: `scale(${STILL_SCALE})` }, { transform: `scale(${STILL_SCALE})` }]
  const [inhaleEnd, holdEnd] = PHASE_ENDS
  return [
    { offset: 0, transform: `scale(${RESTING_SCALE})`, easing: ease },
    { offset: inhaleEnd, transform: `scale(${GROWN_SCALE})`, easing: 'linear' },
    { offset: holdEnd, transform: `scale(${GROWN_SCALE})`, easing: ease },
    { offset: 1, transform: `scale(${RESTING_SCALE})` },
  ]
}

// Halo brightens with the in-breath, dims a touch and returns during the hold
// (so the hold reads as "holding", not frozen), and fades on the out-breath.
function haloKeyframes(ease: string, reduced: boolean): Keyframe[] {
  if (reduced) return [{ opacity: 0.55 }, { opacity: 0.55 }]
  const [inhaleEnd, holdEnd] = PHASE_ENDS
  return [
    { offset: 0, opacity: 0.3, easing: ease },
    { offset: inhaleEnd, opacity: 0.8, easing: ease },
    { offset: (inhaleEnd + holdEnd) / 2, opacity: 0.62, easing: ease },
    { offset: holdEnd, opacity: 0.8, easing: ease },
    { offset: 1, opacity: 0.3 },
  ]
}

// One arc per phase, proportional to its length, with a small gap after it.
// `start` is where the arc begins along the ring (SVG dashoffset = -start).
const RING_ARCS = BREATH_PHASES.map((p, i) => {
  const start = (i === 0 ? 0 : PHASE_ENDS[i - 1]) * RING_C
  const length = Math.max(((p.seconds * 1000) / CYCLE_MS) * RING_C - RING_GAP, 0)
  return { key: p.key, color: p.color, start, length }
})

export default function CheckInModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('CheckInModal')
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const circleRef = useRef<HTMLDivElement>(null)
  const haloRef = useRef<HTMLDivElement>(null)
  const ringArcRefs = useRef<(SVGCircleElement | null)[]>([])
  const animationsRef = useRef<Animation[]>([])

  const [cycleIndex, setCycleIndex] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  const phase = BREATH_PHASES[phaseIndex]

  // Start the breath animation and follow its clock.
  useEffect(() => {
    const circle = circleRef.current
    const halo = haloRef.current
    if (!circle || !halo) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ease =
      getComputedStyle(document.documentElement).getPropertyValue('--ease-breath').trim() || BREATH_EASE_FALLBACK
    const timing: KeyframeAnimationOptions = { duration: CYCLE_MS, iterations: CYCLE_COUNT, fill: 'forwards' }

    const clock = circle.animate(circleKeyframes(ease, reduced), timing)
    const haloAnim = halo.animate(haloKeyframes(ease, reduced), timing)
    animationsRef.current = [clock, haloAnim]

    let frame = 0
    const total = CYCLE_MS * CYCLE_COUNT
    function tick() {
      const now = typeof clock.currentTime === 'number' ? clock.currentTime : 0
      const elapsed = Math.min(now, total - 1)
      const within = elapsed % CYCLE_MS
      setCycleIndex(Math.floor(elapsed / CYCLE_MS))
      setPhaseIndex(phaseIndexAt(within / CYCLE_MS))
      // Each phase's arc fills in its own color as the clock passes through it.
      const progressed = (within / CYCLE_MS) * RING_C
      RING_ARCS.forEach((arc, i) => {
        const el = ringArcRefs.current[i]
        if (!el) return
        const filled = Math.min(Math.max(progressed - arc.start, 0), arc.length)
        el.style.strokeDasharray = `${filled} ${RING_C}`
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    clock.onfinish = () => {
      cancelAnimationFrame(frame)
      setDone(true)
    }

    return () => {
      cancelAnimationFrame(frame)
      clock.onfinish = null
      clock.cancel()
      haloAnim.cancel()
      animationsRef.current = []
    }
  }, [])

  function togglePause() {
    const next = !paused
    for (const a of animationsRef.current) {
      if (next) a.pause()
      else a.play()
    }
    setPaused(next)
  }

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm liquid-glass bg-[var(--color-violet-900)] border border-white/10 rounded-3xl p-6 space-y-6 text-center animate-fade-in"
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
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Progress ring: one arc per phase in its own color — a faint track, and a fill that follows the clock. */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden="true"
              className={`absolute inset-0 -rotate-90 transition-opacity duration-(--motion-slow) ${done ? 'opacity-0' : 'opacity-100'}`}
            >
              {RING_ARCS.map((arc) => (
                <circle
                  key={`track-${arc.key}`}
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke={arc.color}
                  strokeOpacity="0.18"
                  strokeWidth="1.5"
                  strokeDasharray={`${arc.length} ${RING_C}`}
                  strokeDashoffset={-arc.start}
                />
              ))}
              {RING_ARCS.map((arc, i) => (
                <circle
                  key={`fill-${arc.key}`}
                  ref={(el) => {
                    ringArcRefs.current[i] = el
                  }}
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="1.5"
                  strokeDasharray={`0 ${RING_C}`}
                  strokeDashoffset={-arc.start}
                />
              ))}
            </svg>
            <div ref={circleRef} className="absolute inset-5" style={{ transform: `scale(${RESTING_SCALE})` }}>
              <div
                ref={haloRef}
                className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,_var(--color-violet-400)_0%,_transparent_70%)] opacity-30 blur-md"
              />
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_var(--color-violet-500)_0%,_var(--color-violet-600)_60%,_transparent_100%)] opacity-70" />
              <div className="absolute inset-3 rounded-full border border-white/20" />
            </div>
          </div>

          {/* Paused dimming sits on the wrapper: the label's own fade-in fill would override opacity on the <p>. */}
          <div aria-live="polite" className={`min-h-6 transition-opacity ${paused ? 'opacity-50' : ''}`}>
            <p
              key={done ? 'done' : `${cycleIndex}-${phase.key}`}
              className="text-white text-base font-medium animate-fade-in"
            >
              {done ? t('doneLabel') : t(PHASE_LABEL_KEY[phase.key])}
            </p>
          </div>

          {done ? (
            <p className="text-white/50 text-xs animate-fade-in">{t('subtitle')}</p>
          ) : (
            <div className="flex items-center gap-3 text-xs text-white/50">
              <span>{t('breathCount', { current: cycleIndex + 1, total: CYCLE_COUNT })}</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={togglePause}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-white/70 hover:text-white hover:border-white/30 transition-colors"
              >
                {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {paused ? t('resume') : t('pause')}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[var(--color-text-tertiary)] text-xs">{t('moodPrompt')}</p>
          {selectedMood ? (
            <p className="text-[var(--color-violet-300)] text-sm animate-fade-in">{t('moodThanks')}</p>
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
