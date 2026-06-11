'use client'

const AFFIRMATIONS = [
  'You showed up for yourself today. That takes real courage.',
  'Every decision made with awareness is a step toward your truest self.',
  'Clarity is a gift you\'ve given yourself today.',
  'You did the inner work. That matters more than you know.',
  'Slowing down to listen to yourself is never time wasted.',
  'The courage to look within is the beginning of all wisdom.',
  'You chose to understand yourself better. That is everything.',
]

interface Props {
  userName: string
  decisionTitle: string
  onContinue: () => void
}

export default function CelebrationScreen({ userName, decisionTitle, onContinue }: Props) {
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  const affirmation = AFFIRMATIONS[Math.floor(decisionTitle.length % AFFIRMATIONS.length)]

  return (
    <div className="relative h-dvh max-w-[393px] mx-auto flex flex-col items-center justify-center overflow-hidden px-8">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,_rgba(167,139,250,0.22)_0%,_rgba(139,92,246,0.10)_50%,_transparent_80%)] -z-10" />

      {/* Floating stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {[
          { top: '12%', left: '18%', size: 'text-lg', delay: '0s' },
          { top: '20%', right: '15%', size: 'text-sm', delay: '0.4s' },
          { top: '35%', left: '8%',  size: 'text-xs', delay: '0.8s' },
          { top: '70%', right: '10%', size: 'text-base', delay: '0.2s' },
          { top: '80%', left: '20%', size: 'text-xs', delay: '1s' },
          { top: '55%', right: '22%', size: 'text-sm', delay: '0.6s' },
        ].map((s, i) => (
          <span
            key={i}
            className="absolute text-purple-300/40 animate-pulse"
            style={{ top: s.top, left: (s as { left?: string }).left, right: (s as { right?: string }).right, fontSize: undefined, animationDelay: s.delay }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="flex flex-col items-center text-center space-y-8 fade-up">
        {/* Glow orb */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-yellow-400/20 border border-purple-400/30 flex items-center justify-center text-4xl shadow-[0_0_60px_rgba(167,139,250,0.3)]">
            ✦
          </div>
          <div className="absolute inset-0 rounded-full animate-ping bg-purple-500/10" style={{ animationDuration: '2.5s' }} />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl font-semibold tracking-tight">
            Well Done{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-purple-300/70 text-sm">
            You've completed your decision journey.
          </p>
        </div>

        {/* Affirmation */}
        <div className="bg-white/5 border border-white/10 rounded-3xl px-6 py-5">
          <p className="text-white/75 text-sm leading-relaxed italic">
            "{affirmation}"
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] text-sm font-semibold transition-all shadow-lg"
        >
          See your summary →
        </button>

        <button
          onClick={onContinue}
          className="text-white/30 text-xs hover:text-white/50 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
