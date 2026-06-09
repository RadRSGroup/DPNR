'use client'
import { STEP_LABELS, TOTAL_STEPS } from '@/lib/types'
import { useRouter } from 'next/navigation'

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

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      {/* Galaxy background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] -z-10" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >
          ✕
        </button>

        <div className="flex items-center gap-2">
          {/* Avatar / AI icon */}
          <div className="w-6 h-6 rounded-full bg-purple-500/40 flex items-center justify-center text-xs">
            ✦
          </div>
          <span className="text-white/40 text-xs">Manifest yo...</span>
          <span className="text-white/30 text-xs">{minutesLeft} min</span>
        </div>

        {/* Info */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 text-sm">
          ?
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i + 1 < step
                ? 'bg-purple-400 w-4'
                : i + 1 === step
                ? 'bg-purple-400 w-6 glow-pulse'
                : 'bg-white/20 w-4'
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
      <div className="flex-1 flex flex-col px-5 pb-4 fade-up">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-5 pb-8 pt-2">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-2xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          Back
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-white/40 hover:text-white/60 text-sm transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
