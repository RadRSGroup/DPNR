'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STEP_LABELS, TOTAL_STEPS } from '@/lib/types'
import { useAI } from '@/lib/useAI'

interface StepShellProps {
  step: number
  decisionTitle: string
  children: React.ReactNode
  onBack?: () => void
  onSkip?: () => void
  minutesLeft?: number
}

export default function StepShell({
  step,
  decisionTitle,
  children,
  onBack,
  onSkip,
  minutesLeft = 27,
}: StepShellProps) {
  const router = useRouter()
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoText, setInfoText] = useState<string | null>(null)
  const { callAI, loading: aiLoading } = useAI()

  async function handleInfo() {
    setInfoOpen(true)
    if (infoText) return
    const res = await callAI<{ info: string }>('step_info', {
      step,
      stepLabel: STEP_LABELS[step],
      decisionTitle: decisionTitle || 'your decision',
    })
    if (res?.info) setInfoText(res.info)
  }

  return (
    <div className="relative h-dvh flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      {/* Galaxy background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
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
          <div className="w-6 h-6 rounded-full bg-purple-500/40 flex items-center justify-center text-xs">
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
                ? 'bg-purple-400 w-5'
                : i + 1 === step
                ? 'bg-purple-300 w-8 shadow-[0_0_6px_rgba(167,139,250,0.8)]'
                : 'bg-white/15 w-4'
            }`}
          />
        ))}
      </div>

      {/* Decision title + step label */}
      <div className="text-center px-6 pt-4 pb-2">
        <h2 className="text-white text-lg font-light">"{decisionTitle}"</h2>
        <p className="text-white/50 text-xs mt-1">
          Step {String(step).padStart(2, '0')}: {STEP_LABELS[step]}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto flex flex-col px-5 pb-4 fade-up">
        {children}
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
            className="w-full bg-[#1a0826] border border-purple-700/40 rounded-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-purple-300 text-xs uppercase tracking-widest">
                Step {String(step).padStart(2, '0')} · {STEP_LABELS[step]}
              </p>
              <button
                onClick={() => setInfoOpen(false)}
                className="text-white/30 hover:text-white/60 text-lg transition-colors"
              >
                ✕
              </button>
            </div>
            {aiLoading && !infoText ? (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating guidance…
              </div>
            ) : (
              <p className="text-white/70 text-sm leading-relaxed">{infoText ?? '—'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
