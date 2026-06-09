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
            <div className="relative w-36 h-52">
              <svg viewBox="0 0 120 180" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="bodyGlow" cx="50%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#c8a060" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#c8a060" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffe8a0" stopOpacity="1" />
                    <stop offset="40%" stopColor="#f0a830" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#c8601000" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="softGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Body ambient glow */}
                <ellipse cx="60" cy="88" rx="38" ry="70" fill="url(#bodyGlow)" />

                {/* Human silhouette — filled semi-transparent */}
                <path
                  d="M60 4 C53 4 48 9 48 16 C48 23 53 28 60 28 C67 28 72 23 72 16 C72 9 67 4 60 4 Z
                     M52 30 C44 31 36 35 34 42 L28 68 L36 70 L40 54 L40 170 L46 170 L48 118 L52 118 L54 170 L66 170 L68 118 L72 118 L74 170 L80 170 L80 54 L84 70 L92 68 L86 42 C84 35 76 31 68 30 Z"
                  fill="rgba(200,160,80,0.07)"
                  stroke="rgba(200,160,80,0.25)"
                  strokeWidth="0.6"
                />

                {/* Neural network lines inside body */}
                <g stroke="#c8a060" strokeWidth="0.5" opacity="0.35" filter="url(#glow)">
                  {/* Spine */}
                  <line x1="60" y1="28" x2="60" y2="118" />
                  {/* Rib lines */}
                  <path d="M60 46 Q50 50 44 48" /><path d="M60 46 Q70 50 76 48" />
                  <path d="M60 54 Q48 58 42 55" /><path d="M60 54 Q72 58 78 55" />
                  <path d="M60 62 Q50 65 44 63" /><path d="M60 62 Q70 65 76 63" />
                  {/* Collarbone */}
                  <path d="M52 32 Q44 34 36 38" /><path d="M68 32 Q76 34 84 38" />
                  {/* Shoulder to elbow to wrist */}
                  <path d="M36 38 Q30 55 28 68" /><path d="M84 38 Q90 55 92 68" />
                  {/* Pelvis */}
                  <path d="M48 100 Q54 106 60 108" /><path d="M72 100 Q66 106 60 108" />
                  {/* Thigh connections */}
                  <path d="M48 110 Q44 130 43 150" /><path d="M72 110 Q76 130 77 150" />
                  <path d="M46 118 Q52 128 54 142" /><path d="M74 118 Q68 128 66 142" />
                  {/* Head cross lines */}
                  <path d="M52 10 Q60 14 68 10" />
                  <path d="M50 16 Q60 18 70 16" />
                </g>

                {/* Constellation dots — body nodes */}
                <g fill="#d4aa68" filter="url(#glow)">
                  {/* Head nodes */}
                  <circle cx="60" cy="8" r="1.2" opacity="0.7" />
                  <circle cx="53" cy="14" r="0.9" opacity="0.6" />
                  <circle cx="67" cy="14" r="0.9" opacity="0.6" />
                  <circle cx="56" cy="20" r="0.8" opacity="0.5" />
                  <circle cx="64" cy="20" r="0.8" opacity="0.5" />
                  {/* Shoulder nodes */}
                  <circle cx="36" cy="38" r="1.2" opacity="0.8" />
                  <circle cx="84" cy="38" r="1.2" opacity="0.8" />
                  {/* Arm nodes */}
                  <circle cx="30" cy="54" r="0.9" opacity="0.6" />
                  <circle cx="90" cy="54" r="0.9" opacity="0.6" />
                  <circle cx="28" cy="68" r="1" opacity="0.7" />
                  <circle cx="92" cy="68" r="1" opacity="0.7" />
                  {/* Torso nodes */}
                  <circle cx="44" cy="48" r="0.9" opacity="0.55" />
                  <circle cx="76" cy="48" r="0.9" opacity="0.55" />
                  <circle cx="42" cy="60" r="0.8" opacity="0.5" />
                  <circle cx="78" cy="60" r="0.8" opacity="0.5" />
                  <circle cx="48" cy="72" r="0.9" opacity="0.6" />
                  <circle cx="72" cy="72" r="0.9" opacity="0.6" />
                  <circle cx="46" cy="88" r="0.9" opacity="0.55" />
                  <circle cx="74" cy="88" r="0.9" opacity="0.55" />
                  {/* Hip nodes */}
                  <circle cx="48" cy="100" r="1" opacity="0.65" />
                  <circle cx="72" cy="100" r="1" opacity="0.65" />
                  {/* Leg nodes */}
                  <circle cx="46" cy="118" r="0.9" opacity="0.6" />
                  <circle cx="74" cy="118" r="0.9" opacity="0.6" />
                  <circle cx="44" cy="138" r="0.8" opacity="0.5" />
                  <circle cx="76" cy="138" r="0.8" opacity="0.5" />
                  <circle cx="43" cy="155" r="0.8" opacity="0.45" />
                  <circle cx="77" cy="155" r="0.8" opacity="0.45" />
                  <circle cx="43" cy="168" r="0.7" opacity="0.35" />
                  <circle cx="77" cy="168" r="0.7" opacity="0.35" />
                </g>

                {/* Cross-body constellation lines */}
                <g stroke="#d4aa68" strokeWidth="0.4" opacity="0.2">
                  <line x1="44" y1="48" x2="60" y2="44" /><line x1="76" y1="48" x2="60" y2="44" />
                  <line x1="42" y1="60" x2="48" y2="72" /><line x1="78" y1="60" x2="72" y2="72" />
                  <line x1="46" y1="88" x2="48" y2="100" /><line x1="74" y1="88" x2="72" y2="100" />
                  <line x1="36" y1="38" x2="44" y2="48" /><line x1="84" y1="38" x2="76" y2="48" />
                </g>

                {/* Heart glow — central energy point */}
                <circle cx="60" cy="44" r="10" fill="url(#heartGlow)" opacity="0.6" filter="url(#softGlow)" />
                <circle cx="60" cy="44" r="5" fill="rgba(255,220,120,0.4)" filter="url(#softGlow)" />
                <circle cx="60" cy="44" r="2.5" fill="rgba(255,240,180,0.9)" filter="url(#glow)" />
                <circle cx="60" cy="44" r="1" fill="#fffdf0" />

                {/* Subtle particle scatter */}
                <g fill="#c8a060" opacity="0.3">
                  <circle cx="55" cy="36" r="0.6" /><circle cx="65" cy="38" r="0.5" />
                  <circle cx="57" cy="52" r="0.5" /><circle cx="63" cy="50" r="0.6" />
                  <circle cx="58" cy="78" r="0.5" /><circle cx="62" cy="82" r="0.4" />
                  <circle cx="50" cy="64" r="0.4" /><circle cx="70" cy="66" r="0.4" />
                </g>
              </svg>
            </div>
          </div>

          <PrimaryButton label="Let's dive deep" onClick={onNext} />
        </div>
      </div>
    </div>
  )
}
