'use client'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'
import Card from '@/components/ui/Card'

const AFFIRMATIONS = [
  'Looking honestly at yourself takes real courage.',
  'Every pattern you notice is one you can start to change.',
  'Awareness is the first, quiet act of change.',
  'You showed up for yourself today. That matters.',
  'Understanding your reactions is how you loosen their grip.',
]

interface Props {
  userName: string
  situation: string
  trigger?: string
  synthesis?: string
  commitment?: string
  onDone: () => void
}

/** Adapted from components/decision/CompletionScreen.tsx. No "view full summary" link — no Mirror Room detail/review page exists (out of scope, same as decision/[id]/page.tsx's precedent). */
export default function CompletionScreen({ userName, situation, trigger, synthesis, commitment, onDone }: Props) {
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  const affirmation = AFFIRMATIONS[Math.floor(situation.length % AFFIRMATIONS.length)]

  return (
    <RoomScreenFrame backgroundSrc="/images/backgrounds/mirror-bg.webp" glows={['bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.5)_0%,_rgba(80,20,140,0.3)_45%,_transparent_75%)]']}>

      <div className="scrollbar-glass flex-1 overflow-y-auto px-6 pt-16 lg:pt-10 pb-32 space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-yellow-400/20 border border-yellow-400/40 mx-auto" />
          <h1 className="text-white text-2xl font-medium">
            Well done, {firstName}!
          </h1>
          <p className="text-white/60 text-sm leading-relaxed italic">
            &quot;{affirmation}&quot;
          </p>
        </div>

        <Card className="space-y-4">
          <p className="text-purple-400 text-xs uppercase tracking-wide font-medium">What you looked at</p>
          <p className="text-white text-base font-light leading-relaxed">&quot;{situation}&quot;</p>
          {trigger && (
            <p className="text-white/50 text-xs leading-relaxed">Triggered by: {trigger}</p>
          )}
        </Card>

        {synthesis && (
          <div className="bg-purple-900/15 border border-purple-700/25 rounded-2xl p-4 space-y-1">
            <p className="text-purple-400 text-xs uppercase tracking-wide">Synthesis</p>
            <p className="text-white/70 text-sm italic leading-relaxed">&quot;{synthesis}&quot;</p>
          </div>
        )}

        {commitment && (
          <Card className="space-y-1">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">Your commitment</p>
            <p className="text-white/70 text-sm leading-relaxed">{commitment}</p>
          </Card>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#1a0826] via-[#1a0826]/80 to-transparent">
        <InvertedButton onClick={onDone} className="w-full py-3.5" label="Back to InnerOS" />
      </div>
    </RoomScreenFrame>
  )
}
