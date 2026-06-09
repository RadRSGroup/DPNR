'use client'

interface Props {
  userName: string
  onNext: () => void
}

export default function WelcomeScreen({ userName, onNext }: Props) {
  const firstName = userName.split(' ')[0] || userName.split('@')[0] || 'You'

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(120,40,200,0.12)_0%,_transparent_70%)] -z-10" />

      <div className="w-full backdrop-blur-sm bg-white/5 border border-white/15 rounded-3xl px-6 py-8 text-center shadow-2xl">
        <h1 className="text-white text-2xl font-light leading-snug mb-3">
          Welcome {firstName}<br />to Your Decision Room
        </h1>
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          Welcome to the Decision Room, a space where we explore the choices in front of you, deepen your alignment, and help you make decisions that reflect your true self.
        </p>

        {/* Human figure placeholder */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-28 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(200,150,80,0.25)_0%,_transparent_70%)] rounded-full" />
            <svg viewBox="0 0 60 80" className="w-20 h-24 opacity-70" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="10" r="8" stroke="#c8a060" strokeWidth="1.5" />
              <line x1="30" y1="18" x2="30" y2="48" stroke="#c8a060" strokeWidth="1.5" />
              <line x1="30" y1="28" x2="12" y2="40" stroke="#c8a060" strokeWidth="1.5" />
              <line x1="30" y1="28" x2="48" y2="40" stroke="#c8a060" strokeWidth="1.5" />
              <line x1="30" y1="48" x2="18" y2="70" stroke="#c8a060" strokeWidth="1.5" />
              <line x1="30" y1="48" x2="42" y2="70" stroke="#c8a060" strokeWidth="1.5" />
              <circle cx="30" cy="30" r="4" fill="rgba(200,160,80,0.4)" />
              <circle cx="30" cy="30" r="2" fill="rgba(220,180,100,0.8)" />
            </svg>
          </div>
        </div>

        <button
          onClick={onNext}
          className="w-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] font-medium rounded-2xl py-4 text-base transition-all"
        >
          Let's dive deep
        </button>
      </div>
    </div>
  )
}
