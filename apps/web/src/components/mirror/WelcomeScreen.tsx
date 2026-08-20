'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  userName: string
  onNext: () => void
}

/** Adapted from components/decision/WelcomeScreen.tsx — same layout, Mirror Room framing. */
export default function WelcomeScreen({ userName, onNext }: Props) {
  const router = useRouter()
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  return (
    <div className="relative h-dvh flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >✕</button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/40 flex items-center justify-center text-xs">✦</div>
          <span className="text-white/40 text-xs">Mirror Room</span>
          <span className="text-white/30 text-xs">12 min</span>
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 text-sm">?</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 pb-8 fade-up">
        <div className="w-full text-center space-y-5">

          <h1 className="text-white text-2xl font-light leading-snug">
            Welcome {firstName}<br />to Your Mirror Room
          </h1>

          <p className="text-white/50 text-sm leading-relaxed">
            This is your space to look honestly at a moment that got under your skin — what happened, how you reacted, and what it might be showing you about yourself.
          </p>

          {/* Human figure with edge blending */}
          <div className="flex justify-center py-1">
            <div
              className="relative w-48 h-64"
              style={{
                maskImage: 'radial-gradient(ellipse 75% 80% at 50% 48%, black 35%, rgba(0,0,0,0.6) 60%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 75% 80% at 50% 48%, black 35%, rgba(0,0,0,0.6) 60%, transparent 100%)',
              }}
            >
              <Image
                src="/human-figure.png"
                alt="Human energy figure"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <PrimaryButton label="Let's reflect" onClick={onNext} />

          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
              aria-label="Back to dashboard"
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
