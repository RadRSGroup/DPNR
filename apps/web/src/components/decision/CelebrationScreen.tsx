'use client'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'

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
    <RoomScreenFrame glows={['bg-[radial-gradient(ellipse_60%_55%_at_50%_45%,_rgba(167,139,250,0.22)_0%,_rgba(139,92,246,0.10)_50%,_transparent_80%)]']} className="items-center justify-center px-8">

      <div className="flex flex-col items-center text-center space-y-8 animate-settle-in">
        {/* Glow orb */}
        <div className="relative isolate">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-yellow-400/20 border border-purple-400/30 shadow-[0_0_60px_rgba(167,139,250,0.3)]" />
          {/* A slow breathing glow — calm, not a celebration burst (docs/MOTION.md). */}
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-[radial-gradient(circle,_rgba(167,139,250,0.35)_0%,_transparent_70%)] blur-xl animate-soft-glow" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-white text-3xl font-semibold tracking-tight">
            Well Done{firstName ? `, ${firstName}` : ''}!
          </h1>
          <p className="text-purple-300/70 text-sm">
            You&apos;ve completed your decision journey.
          </p>
        </div>

        {/* Affirmation */}
        <div className="bg-white/5 border border-white/10 rounded-3xl px-6 py-5">
          <p className="text-white/75 text-sm leading-relaxed italic">
            &quot;{affirmation}&quot;
          </p>
        </div>

        {/* CTA */}
        <InvertedButton onClick={onContinue} className="w-full py-4 shadow-lg" label="See your summary →" />

        <button
          onClick={onContinue}
          className="text-[var(--color-text-tertiary)] text-xs hover:text-white/50 transition-colors"
        >
          Skip
        </button>
      </div>
    </RoomScreenFrame>
  )
}
