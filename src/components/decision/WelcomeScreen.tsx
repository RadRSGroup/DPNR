'use client'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  userName: string
  onNext: () => void
}

export default function WelcomeScreen({ userName, onNext }: Props) {
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

      {/* Top bar — matches StepShell */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <div className="w-8 h-8" />
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
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-light leading-snug">
              Welcome {firstName}<br />to Your Decision Room
            </h1>
          </div>

          <p className="text-white/50 text-sm leading-relaxed">
            Welcome to the Decision Room, a space where we explore the choices in front of you, deepen your alignment, and help you make decisions that reflect your true self.
          </p>

          {/* Human figure */}
          <div className="flex justify-center py-2">
            <div className="relative w-28 h-36">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,_rgba(200,150,80,0.18)_0%,_transparent_70%)]" />
              <svg viewBox="0 0 80 120" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Head */}
                <ellipse cx="40" cy="12" rx="9" ry="11" stroke="#c8a060" strokeWidth="1.2" />
                {/* Neck */}
                <path d="M36 22 Q40 26 44 22" stroke="#c8a060" strokeWidth="1.2" />
                {/* Shoulders */}
                <path d="M44 26 Q52 24 58 28" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M36 26 Q28 24 22 28" stroke="#c8a060" strokeWidth="1.2" />
                {/* Torso */}
                <path d="M36 26 Q34 42 35 56" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M44 26 Q46 42 45 56" stroke="#c8a060" strokeWidth="1.2" />
                {/* Chest across */}
                <path d="M36 34 Q40 36 44 34" stroke="#c8a060" strokeWidth="0.8" opacity="0.6" />
                {/* Hips */}
                <path d="M35 56 Q40 60 45 56" stroke="#c8a060" strokeWidth="1.2" />
                {/* Left arm */}
                <path d="M22 28 Q18 38 16 50" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M16 50 Q14 58 15 64" stroke="#c8a060" strokeWidth="1.1" />
                {/* Right arm */}
                <path d="M58 28 Q62 38 64 50" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M64 50 Q66 58 65 64" stroke="#c8a060" strokeWidth="1.1" />
                {/* Left leg */}
                <path d="M37 56 Q34 72 32 88" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M32 88 Q30 100 31 110" stroke="#c8a060" strokeWidth="1.1" />
                {/* Right leg */}
                <path d="M43 56 Q46 72 48 88" stroke="#c8a060" strokeWidth="1.2" />
                <path d="M48 88 Q50 100 49 110" stroke="#c8a060" strokeWidth="1.1" />
                {/* Heart / energy center glow */}
                <circle cx="40" cy="38" r="4" fill="rgba(200,160,80,0.15)" />
                <circle cx="40" cy="38" r="2" fill="rgba(230,190,110,0.6)" />
                <circle cx="40" cy="38" r="1" fill="#fff8e8" />
              </svg>
            </div>
          </div>

          <PrimaryButton label="Let's dive deep" onClick={onNext} />
        </div>
      </div>
    </div>
  )
}
