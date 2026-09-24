'use client'
import { useRouter } from '@/i18n/navigation'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'
import Card from '@/components/ui/Card'

const AFFIRMATIONS = [
  'You showed up for yourself today. That takes real courage.',
  'Every decision made with awareness is a step toward your truest self.',
  'Clarity is a gift you\'ve given yourself today.',
  'You did the inner work. That matters more than you know.',
  'Slowing down to listen to yourself is never time wasted.',
]

interface Props {
  userName: string
  decisionTitle: string
  optionA?: string
  optionB?: string
  chosenLean?: string
  reflectionNote?: string
  commitment?: string
  decisionId?: string
  onDone: () => void
}

export default function CompletionScreen({
  userName,
  decisionTitle,
  optionA,
  optionB,
  chosenLean,
  reflectionNote,
  commitment,
  decisionId,
  onDone,
}: Props) {
  const router = useRouter()
  const firstName = userName.includes('@')
    ? userName.split('@')[0]
    : userName.split(' ')[0] || userName

  const affirmation = AFFIRMATIONS[Math.floor(decisionTitle.length % AFFIRMATIONS.length)]

  const leanLabel = chosenLean === 'A' ? 'Option A'
    : chosenLean === 'B' ? 'Option B'
    : chosenLean === 'undecided' ? 'Still undecided' : null

  return (
    <RoomScreenFrame backgroundSrc="/images/backgrounds/decision-bg.webp" glows={['bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.5)_0%,_rgba(80,20,140,0.3)_45%,_transparent_75%)]']}>

      {/* Scrollable content */}
      <div className="scrollbar-glass flex-1 overflow-y-auto px-6 pt-16 lg:pt-10 pb-32 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-yellow-400/20 border border-yellow-400/40 mx-auto" />
          <h1 className="text-white text-2xl font-medium">
            Well done, {firstName}!
          </h1>
          <p className="text-white/60 text-sm leading-relaxed italic">
            &quot;{affirmation}&quot;
          </p>
        </div>

        {/* Decision recap */}
        <Card className="space-y-4">
          <p className="text-purple-400 text-xs uppercase tracking-wide font-medium">Your decision</p>
          <p className="text-white text-base font-light">&quot;{decisionTitle}&quot;</p>

          {/* Options */}
          {(optionA || optionB) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {optionA && (
                <div className={`rounded-xl border p-3 space-y-1 ${chosenLean === 'A' ? 'border-purple-500/60 bg-purple-900/20' : 'border-white/10 bg-white/5'}`}>
                  <p className="text-purple-400 text-xs">Option A {chosenLean === 'A' ? '← your lean' : ''}</p>
                  <p className="text-white/60 text-xs leading-relaxed line-clamp-3">{optionA}</p>
                </div>
              )}
              {optionB && (
                <div className={`rounded-xl border p-3 space-y-1 ${chosenLean === 'B' ? 'border-purple-500/60 bg-purple-900/20' : 'border-white/10 bg-white/5'}`}>
                  <p className="text-purple-400 text-xs">Option B {chosenLean === 'B' ? '← your lean' : ''}</p>
                  <p className="text-white/60 text-xs leading-relaxed line-clamp-3">{optionB}</p>
                </div>
              )}
            </div>
          )}

          {/* Lean */}
          {leanLabel && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[var(--color-text-tertiary)] text-xs">Leaning:</span>
              <span className={`text-xs border rounded-full px-2.5 py-0.5 ${
                chosenLean === 'undecided'
                  ? 'border-white/15 text-[var(--color-text-tertiary)]'
                  : 'border-purple-700/40 bg-purple-900/20 text-purple-300'
              }`}>{leanLabel}</span>
            </div>
          )}
        </Card>

        {/* Reflection note */}
        {reflectionNote && (
          <div className="bg-purple-900/15 border border-purple-700/25 rounded-2xl p-4 space-y-1">
            <p className="text-purple-400 text-xs uppercase tracking-wide">What felt true</p>
            <p className="text-white/70 text-sm italic leading-relaxed">&quot;{reflectionNote}&quot;</p>
          </div>
        )}

        {/* Commitment */}
        {commitment && (
          <Card className="space-y-1">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">Your commitment</p>
            <p className="text-white/70 text-sm leading-relaxed">{commitment}</p>
          </Card>
        )}
      </div>

      {/* Footer buttons */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#1a0826] via-[#1a0826]/80 to-transparent flex flex-col gap-3">
        {decisionId && (
          <button
            onClick={() => router.push(`/decision/${decisionId}`)}
            className="w-full py-3.5 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/35 text-sm font-medium transition-all"
          >
            View full summary
          </button>
        )}
        <InvertedButton onClick={onDone} className="w-full py-3.5" label="Back to InnerOS" />
      </div>
    </RoomScreenFrame>
  )
}
