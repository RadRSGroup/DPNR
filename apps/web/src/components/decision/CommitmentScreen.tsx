'use client'
import { useState } from 'react'
import { CalendarButtons } from '@/components/ui/CalendarButtons'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import InvertedButton from '@/components/ui/InvertedButton'

interface CommitmentScreenProps {
  decisionTitle: string
  nextStep?: string
  onDone: (commitment: string) => void
  onBack: () => void
}

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function CommitmentScreen({ decisionTitle, nextStep, onDone, onBack }: CommitmentScreenProps) {
  const [commitment, setCommitment] = useState(nextStep ?? '')
  const [reviewDate] = useState<string | null>(null)

  const calendarTitle = commitment.trim() || `Workshop Rooms check-in: "${decisionTitle}"`
  const calendarDate = reviewDate ?? addDays(7)

  return (
    <RoomScreenFrame backgroundSrc="/images/backgrounds/decision-bg.webp" glows={['bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.45)_0%,_rgba(80,20,140,0.25)_45%,_transparent_75%)]']}>

      {/* Header */}
      <div className="pt-14 lg:pt-8 px-5 pb-4 text-center space-y-1">
        <h1 className="text-white text-lg font-medium">&quot;{decisionTitle}&quot;</h1>
        <p className="text-white/50 text-sm">Last Step: Before You Leave</p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-5 space-y-5 overflow-y-auto no-scrollbar pb-4">

        {/* Inspirational card */}
        <div className="bg-white/8 border border-white/12 rounded-3xl px-5 py-6 space-y-4 text-center">
          <p className="text-white/60 text-sm leading-relaxed">
            Many decisions carry different needs, hopes, and fears within them.
          </p>
          <div className="w-8 h-px bg-white/15 mx-auto" />
          <p className="text-white/80 text-sm leading-relaxed">
            Before you leave this space, take a gentle moment with yourself.
            Looking closely at a decision is not always easy.
            It takes honesty, courage, and care. You&apos;ve taken the time to listen to your
            thoughts, emotions, and what matters most to you.
          </p>
          <p className="text-white font-medium text-sm">What are you committing to from here?</p>
        </div>

        {/* Commitment input */}
        <textarea
          value={commitment}
          onChange={e => setCommitment(e.target.value.slice(0, 5000))}
          rows={3}
          placeholder='Type: "I commit to taking this step by:"'
          className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
        />

        {/* Add to Calendar */}
        <div className="space-y-2">
          <p className="text-[var(--color-text-tertiary)] text-xs text-center">Add a reminder</p>
          <CalendarButtons
            title={calendarTitle}
            date={calendarDate}
            description={`Workshop Rooms check-in for: "${decisionTitle}"`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-8 pt-3 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/35 text-sm font-medium transition-all"
        >
          Back
        </button>
        <InvertedButton onClick={() => onDone(commitment.trim())} className="flex-1 py-3.5" label="Done" />
      </div>
    </RoomScreenFrame>
  )
}
