'use client'
import { useRouter } from 'next/navigation'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function MomentScreen({ onNext, onBack }: Props) {
  const router = useRouter()
  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

      {/* Top bar — matches StepShell */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >✕</button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/40 flex items-center justify-center text-xs">
            ✦
          </div>
          <span className="text-white/40 text-xs">Manifest yo...</span>
          <span className="text-white/30 text-xs">28 min</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 text-sm">?</div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 fade-up">
        <div className="w-full text-center space-y-6">
          <h1 className="text-white text-2xl font-light leading-snug">
            A moment before<br />We Begin
          </h1>

          <p className="text-white/50 text-sm leading-relaxed">
            Welcome to the Decision Room, a space where we explore the choices in front of you, deepen your alignment, and help you make decisions that reflect your true self.
          </p>

          <PrimaryButton label="Make a decision" onClick={onNext} />

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={onNext}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
              aria-label="Next"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
