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
            <div className="relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(200,150,80,0.2)_0%,_transparent_70%)]" />
              <svg viewBox="0 0 60 84" className="w-20 h-28 opacity-75" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="9" r="7" stroke="#c8a060" strokeWidth="1.2" />
                <line x1="30" y1="16" x2="30" y2="50" stroke="#c8a060" strokeWidth="1.2" />
                <line x1="30" y1="26" x2="10" y2="40" stroke="#c8a060" strokeWidth="1.2" />
                <line x1="30" y1="26" x2="50" y2="40" stroke="#c8a060" strokeWidth="1.2" />
                <line x1="30" y1="50" x2="17" y2="74" stroke="#c8a060" strokeWidth="1.2" />
                <line x1="30" y1="50" x2="43" y2="74" stroke="#c8a060" strokeWidth="1.2" />
                <circle cx="30" cy="32" r="5" fill="rgba(200,160,80,0.25)" />
                <circle cx="30" cy="32" r="2.5" fill="rgba(230,190,110,0.85)" />
                <circle cx="30" cy="32" r="1" fill="#fff8e8" />
              </svg>
            </div>
          </div>

          <PrimaryButton label="Let's dive deep" onClick={onNext} />
        </div>
      </div>
    </div>
  )
}
