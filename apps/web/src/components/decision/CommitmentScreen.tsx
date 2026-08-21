'use client'
import { useState } from 'react'
import { CalendarButtons } from '@/components/ui/CalendarButtons'

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
    <div className="relative h-dvh max-w-[393px] mx-auto flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#1a0826] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.45)_0%,_rgba(80,20,140,0.25)_45%,_transparent_75%)] -z-10" />

      {/* Header */}
      <div className="pt-14 px-5 pb-4 text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-purple-800/40 border border-purple-500/40 flex items-center justify-center text-xl mx-auto mb-3">✦</div>
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
          onChange={e => setCommitment(e.target.value.slice(0, 300))}
          rows={3}
          placeholder='Type: "I commit to taking this step by:"'
          className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
        />

        {/* Add to Calendar */}
        <div className="space-y-2">
          <p className="text-white/30 text-xs text-center">Add a reminder</p>
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
        <button
          onClick={() => onDone(commitment.trim())}
          className="flex-1 py-3.5 rounded-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] text-sm font-semibold transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )
}
