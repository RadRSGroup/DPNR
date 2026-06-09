'use client'
import { useRouter } from 'next/navigation'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  userName: string
  onNext: () => void
}

export default function WelcomeScreen({ userName, onNext }: Props) {
  const router = useRouter()
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

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
            <div className="relative w-40 h-56">
              <svg viewBox="0 0 100 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="hg" cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#c8a060" stopOpacity="0.15"/>
                    <stop offset="100%" stopColor="#c8a060" stopOpacity="0"/>
                  </radialGradient>
                  <radialGradient id="cg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffe090" stopOpacity="1"/>
                    <stop offset="50%" stopColor="#e08820" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#c86010" stopOpacity="0"/>
                  </radialGradient>
                  <filter id="fg"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  <filter id="sg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>

                {/* Ambient body glow */}
                <ellipse cx="50" cy="105" rx="32" ry="80" fill="url(#hg)"/>

                {/* ── HEAD ── */}
                <ellipse cx="50" cy="13" rx="10" ry="12" stroke="#c8a060" strokeWidth="1" opacity="0.8"/>

                {/* ── NECK ── */}
                <path d="M46 25 L46 31 M54 25 L54 31" stroke="#c8a060" strokeWidth="1" opacity="0.7"/>

                {/* ── SHOULDERS & CLAVICLE ── */}
                <path d="M46 31 C44 30 38 29 28 33" stroke="#c8a060" strokeWidth="1" opacity="0.8"/>
                <path d="M54 31 C56 30 62 29 72 33" stroke="#c8a060" strokeWidth="1" opacity="0.8"/>

                {/* ── TORSO ── */}
                <path d="M44 31 C42 40 41 52 42 65 C43 74 44 78 46 82" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                <path d="M56 31 C58 40 59 52 58 65 C57 74 56 78 54 82" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                {/* Waist */}
                <path d="M46 82 C48 84 52 84 54 82" stroke="#c8a060" strokeWidth="1" opacity="0.7"/>
                {/* Hip flare */}
                <path d="M46 82 C43 87 41 91 42 96" stroke="#c8a060" strokeWidth="1" opacity="0.7"/>
                <path d="M54 82 C57 87 59 91 58 96" stroke="#c8a060" strokeWidth="1" opacity="0.7"/>
                {/* Hip base */}
                <path d="M42 96 C45 99 55 99 58 96" stroke="#c8a060" strokeWidth="1" opacity="0.65"/>

                {/* ── LEFT ARM ── */}
                <path d="M28 33 C24 45 21 58 19 70" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                {/* Left forearm */}
                <path d="M19 70 C18 80 17 88 16 95" stroke="#c8a060" strokeWidth="0.9" opacity="0.6"/>
                {/* Left hand */}
                <path d="M16 95 C15 98 14 100 13 103 M16 95 C16 99 16 102 16 105 M16 95 C17 99 18 102 19 104" stroke="#c8a060" strokeWidth="0.7" opacity="0.5"/>

                {/* ── RIGHT ARM ── */}
                <path d="M72 33 C76 45 79 58 81 70" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                {/* Right forearm */}
                <path d="M81 70 C82 80 83 88 84 95" stroke="#c8a060" strokeWidth="0.9" opacity="0.6"/>
                {/* Right hand */}
                <path d="M84 95 C85 98 86 100 87 103 M84 95 C84 99 84 102 84 105 M84 95 C83 99 82 102 81 104" stroke="#c8a060" strokeWidth="0.7" opacity="0.5"/>

                {/* ── LEFT LEG ── */}
                <path d="M44 96 C43 112 42 128 41 144" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                {/* Left shin */}
                <path d="M41 144 C40 158 40 168 41 178" stroke="#c8a060" strokeWidth="0.9" opacity="0.6"/>
                {/* Left foot */}
                <path d="M41 178 C40 182 38 185 36 186 M41 178 C41 182 41 186 40 188" stroke="#c8a060" strokeWidth="0.8" opacity="0.5"/>

                {/* ── RIGHT LEG ── */}
                <path d="M56 96 C57 112 58 128 59 144" stroke="#c8a060" strokeWidth="1" opacity="0.75"/>
                {/* Right shin */}
                <path d="M59 144 C60 158 60 168 59 178" stroke="#c8a060" strokeWidth="0.9" opacity="0.6"/>
                {/* Right foot */}
                <path d="M59 178 C60 182 62 185 64 186 M59 178 C59 182 59 186 60 188" stroke="#c8a060" strokeWidth="0.8" opacity="0.5"/>

                {/* ── INTERNAL LINES (spine, ribs, centre line) ── */}
                <g stroke="#c8a060" strokeWidth="0.5" opacity="0.3">
                  <line x1="50" y1="31" x2="50" y2="96"/>
                  <path d="M50 44 Q44 47 40 46"/><path d="M50 44 Q56 47 60 46"/>
                  <path d="M50 54 Q43 57 39 56"/><path d="M50 54 Q57 57 61 56"/>
                  <path d="M50 64 Q44 67 41 66"/><path d="M50 64 Q56 67 59 66"/>
                  <path d="M50 74 Q46 76 44 76"/><path d="M50 74 Q54 76 56 76"/>
                </g>

                {/* ── NODE DOTS ── */}
                <g fill="#d4aa70" filter="url(#fg)">
                  <circle cx="50" cy="5"  r="1.1" opacity="0.6"/>
                  <circle cx="28" cy="33" r="1.3" opacity="0.85"/>
                  <circle cx="72" cy="33" r="1.3" opacity="0.85"/>
                  <circle cx="19" cy="70" r="1.1" opacity="0.7"/>
                  <circle cx="81" cy="70" r="1.1" opacity="0.7"/>
                  <circle cx="16" cy="95" r="1"   opacity="0.6"/>
                  <circle cx="84" cy="95" r="1"   opacity="0.6"/>
                  <circle cx="44" cy="46" r="0.9" opacity="0.5"/>
                  <circle cx="56" cy="46" r="0.9" opacity="0.5"/>
                  <circle cx="42" cy="66" r="0.9" opacity="0.5"/>
                  <circle cx="58" cy="66" r="0.9" opacity="0.5"/>
                  <circle cx="42" cy="96" r="1.1" opacity="0.65"/>
                  <circle cx="58" cy="96" r="1.1" opacity="0.65"/>
                  <circle cx="41" cy="144" r="1"  opacity="0.6"/>
                  <circle cx="59" cy="144" r="1"  opacity="0.6"/>
                  <circle cx="41" cy="178" r="0.9" opacity="0.45"/>
                  <circle cx="59" cy="178" r="0.9" opacity="0.45"/>
                </g>

                {/* ── HEART GLOW ── */}
                <circle cx="50" cy="48" r="12" fill="url(#cg)" opacity="0.55" filter="url(#sg)"/>
                <circle cx="50" cy="48" r="4"  fill="rgba(255,210,100,0.45)" filter="url(#sg)"/>
                <circle cx="50" cy="48" r="2"  fill="rgba(255,235,160,0.95)" filter="url(#fg)"/>
                <circle cx="50" cy="48" r="0.8" fill="#fffef0"/>
              </svg>
            </div>
          </div>

          <PrimaryButton label="Let's dive deep" onClick={onNext} />

          <div className="flex items-center justify-between mt-4">
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
