'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption } from '@/lib/types'
import { CalendarButtons } from '@/components/ui/CalendarButtons'

interface Step07Props {
  decisionTitle: string
  decisionId?: string
  optionA: DecisionOption
  optionB: DecisionOption
  onComplete: (projectionsA: string[], projectionsB: string[], reviewDate?: string, chosenLean?: string, reflectionNote?: string, commitment?: string) => void
  onBack?: () => void
  onSkip?: () => void
}

type Phase = 'projections' | 'reflect' | 'review_date' | 'complete'

const REVIEW_OPTIONS = [
  { label: 'In 1 week',   days: 7 },
  { label: 'In 1 month',  days: 30 },
  { label: 'In 3 months', days: 90 },
  { label: 'In 6 months', days: 180 },
]

function addDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function Step07({
  decisionTitle, decisionId, optionA, optionB, onComplete, onBack, onSkip
}: Step07Props) {
  const [phase, setPhase] = useState<Phase>('projections')
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [statementsA, setStatementsA] = useState<string[]>([])
  const [statementsB, setStatementsB] = useState<string[]>([])
  const [selectedA, setSelectedA] = useState<string[]>([])
  const [selectedB, setSelectedB] = useState<string[]>([])
  const [customA, setCustomA] = useState('')
  const [customB, setCustomB] = useState('')

  // 7a — reflection
  const [chosenLean, setChosenLean] = useState<'A' | 'B' | 'undecided' | null>(null)
  const [reflectionNote, setReflectionNote] = useState('')

  // 7b — review date
  const [reviewDate, setReviewDate] = useState<string | null>(null)

  // 7c — commitment
  const [commitment, setCommitment] = useState('')

  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  const option = currentOption === 'A' ? optionA : optionB
  const statements = currentOption === 'A' ? statementsA : statementsB
  const selected = currentOption === 'A' ? selectedA : selectedB
  const setSelected = currentOption === 'A' ? setSelectedA : setSelectedB

  useEffect(() => {
    if (currentOption === 'A' && statementsA.length === 0) fetchProjections('A')
    if (currentOption === 'B' && statementsB.length === 0) fetchProjections('B')
  }, [currentOption])

  async function fetchProjections(label: 'A' | 'B') {
    const opt = label === 'A' ? optionA : optionB
    const res = await callAI<{ statements: string[] }>(
      'future_projection',
      { optionLabel: label, optionText: opt.content },
      decisionId
    )
    if (res?.statements) {
      if (label === 'A') setStatementsA(res.statements)
      else setStatementsB(res.statements)
    }
  }

  function toggleStatement(s: string) {
    setSelected(prev =>
      prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]
    )
  }

  function addCustom() {
    const val = currentOption === 'A' ? customA.trim() : customB.trim()
    if (!val) return
    const setStatements = currentOption === 'A' ? setStatementsA : setStatementsB
    setStatements(prev => [...prev, val])
    toggleStatement(val)
    if (currentOption === 'A') setCustomA('')
    else setCustomB('')
  }

  function handleProjectionsNext() {
    if (currentOption === 'A') {
      setCurrentOption('B')
    } else {
      setPhase('reflect')
    }
  }

  function handleReflectNext() {
    setPhase('review_date')
  }

  function handleReviewNext() {
    setPhase('complete')
  }

  function handleFinish() {
    const lean = chosenLean ?? undefined
    onComplete(
      selectedA,
      selectedB,
      reviewDate ?? undefined,
      lean,
      reflectionNote.trim() || undefined,
      commitment.trim() || undefined,
    )
  }

  /* ── Phase: projections ── */
  if (phase === 'projections') {
    return (
      <StepShell step={7} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
        {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
        <div className="flex-1 flex flex-col space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => (
              <div
                key={label}
                className={`rounded-xl border p-3 transition-all ${
                  currentOption === label
                    ? 'border-purple-600/60 bg-purple-900/20'
                    : 'border-white/10 bg-white/5 opacity-50'
                }`}
              >
                <p className="text-purple-400 text-xs mb-1">Option {label}</p>
                <p className="text-white/60 text-xs line-clamp-2">
                  {label === 'A' ? optionA.content : optionB.content}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-center">
            <p className="text-white/70 text-sm">Imagine your life in one year</p>
            <p className="text-white/40 text-xs">if you choose Option {currentOption}.</p>
          </div>

          <div className="flex-1 space-y-2 no-scrollbar overflow-y-auto">
            {loading && statements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-2">
                <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-purple-400/50 text-xs animate-pulse">Imagining your future...</p>
              </div>
            ) : (
              statements.map(s => (
                <button
                  key={s}
                  onClick={() => toggleStatement(s)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selected.includes(s)
                      ? 'bg-purple-900/20 border-purple-600/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                    selected.includes(s)
                      ? 'bg-purple-600 border-purple-500'
                      : 'border-white/30'
                  }`}>
                    {selected.includes(s) && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className={`text-sm ${selected.includes(s) ? 'text-white/90' : 'text-white/60'}`}>
                    {s}
                  </span>
                </button>
              ))
            )}

            {statements.length > 0 && (
              <div className="flex gap-2 pt-1">
                <input
                  value={currentOption === 'A' ? customA : customB}
                  onChange={e => currentOption === 'A' ? setCustomA(e.target.value) : setCustomB(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  placeholder="Something else?"
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={addCustom}
                  className="px-3 py-2 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs hover:bg-purple-800/40 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <PrimaryButton
            label={currentOption === 'A' ? 'Next Option →' : 'Reflect your decision'}
            onClick={handleProjectionsNext}
            disabled={loading && statements.length === 0}
          />
        </div>
      </StepShell>
    )
  }

  /* ── Phase 7a: reflect ── */
  if (phase === 'reflect') {
    return (
      <StepShell step={7} decisionTitle={decisionTitle} onBack={() => setPhase('projections')}>
        <div className="flex-1 flex flex-col space-y-6 pt-2">
          <div className="text-center space-y-1">
            <p className="text-purple-400 text-xs uppercase tracking-widest">Step 7 · Reflect</p>
            <h2 className="text-white text-lg font-light">You've mapped both paths.</h2>
            <p className="text-white/40 text-sm">Now let it settle. Which option leans closer to your truth?</p>
          </div>

          {/* Option lean selector */}
          <div className="grid grid-cols-2 gap-3">
            {(['A', 'B'] as const).map(label => {
              const opt = label === 'A' ? optionA : optionB
              const projSelected = label === 'A' ? selectedA : selectedB
              return (
                <button
                  key={label}
                  onClick={() => setChosenLean(label)}
                  className={`rounded-2xl border p-4 text-left space-y-2 transition-all ${
                    chosenLean === label
                      ? 'border-purple-500/60 bg-purple-900/25'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className="text-purple-400 text-xs font-medium">Option {label}</p>
                  <p className="text-white/70 text-xs leading-relaxed line-clamp-3">{opt.content}</p>
                  {projSelected.length > 0 && (
                    <p className="text-white/30 text-xs">{projSelected.length} futures resonated</p>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setChosenLean('undecided')}
            className={`w-full py-3 rounded-2xl border text-sm transition-all ${
              chosenLean === 'undecided'
                ? 'border-purple-500/40 bg-purple-900/15 text-purple-300'
                : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            Still undecided — and that's okay
          </button>

          {/* One-line reflection */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs text-center">In one sentence — what feels true right now? <span className="text-white/25">(optional)</span></p>
            <textarea
              value={reflectionNote}
              onChange={e => setReflectionNote(e.target.value.slice(0, 200))}
              placeholder="Something in me knows..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          <PrimaryButton
            label="Set a check-in date →"
            onClick={handleReflectNext}
            disabled={!chosenLean}
          />
        </div>
      </StepShell>
    )
  }

  /* ── Phase 7b: review date ── */
  if (phase === 'review_date') {
    return (
      <StepShell step={7} decisionTitle={decisionTitle} onBack={() => setPhase('reflect')}>
        <div className="flex-1 flex flex-col space-y-6 pt-2">
          <div className="text-center space-y-1">
            <p className="text-purple-400 text-xs uppercase tracking-widest">Step 7 · Check-in</p>
            <h2 className="text-white text-lg font-light">When would you like to revisit this?</h2>
            <p className="text-white/40 text-sm">We'll remind you to reflect on how the decision unfolded.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {REVIEW_OPTIONS.map(({ label, days }) => {
              const date = addDays(days)
              return (
                <button
                  key={label}
                  onClick={() => setReviewDate(date)}
                  className={`rounded-2xl border p-4 text-center transition-all ${
                    reviewDate === date
                      ? 'border-purple-500/60 bg-purple-900/25'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <p className={`text-sm font-medium ${reviewDate === date ? 'text-white' : 'text-white/60'}`}>{label}</p>
                  <p className="text-white/30 text-xs mt-1">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </button>
              )
            })}
          </div>

          {/* Custom date */}
          <div className="space-y-1.5">
            <p className="text-white/30 text-xs text-center">Or pick a specific date</p>
            <input
              type="date"
              value={reviewDate ?? ''}
              min={addDays(1)}
              onChange={e => setReviewDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
            />
          </div>

          <PrimaryButton
            label="Save & complete →"
            onClick={handleReviewNext}
            disabled={!reviewDate}
          />

          <button
            onClick={() => { setReviewDate(null); handleReviewNext() }}
            className="text-white/25 text-xs text-center hover:text-white/40 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </StepShell>
    )
  }

  /* ── Phase 7c: final reflection / commitment ── */
  const calendarTitle = commitment.trim()
    ? commitment.trim()
    : `Decision Room check-in: "${decisionTitle}"`
  const calendarDescription = `Revisit your decision about "${decisionTitle}" in Decision Room.`

  return (
    <div className="relative h-dvh max-w-[393px] mx-auto flex flex-col">
      {/* Background — radial purple glow */}
      <div className="absolute inset-0 bg-[#1a0826] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(140,60,220,0.45)_0%,_rgba(80,20,140,0.25)_45%,_transparent_75%)] -z-10" />

      {/* Header */}
      <div className="pt-14 px-5 pb-4 text-center space-y-1">
        <div className="w-12 h-12 rounded-full bg-purple-800/40 border border-purple-500/40 flex items-center justify-center text-xl mx-auto mb-3">
          ✦
        </div>
        <h1 className="text-white text-lg font-medium">"{decisionTitle}"</h1>
        <p className="text-white/50 text-sm">Last Step: Before You Leave</p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 px-5 space-y-5 overflow-y-auto no-scrollbar pb-32">

        {/* Inspirational card */}
        <div className="bg-white/8 border border-white/12 rounded-3xl px-5 py-6 space-y-4 text-center">
          <p className="text-white/60 text-sm italic leading-relaxed">
            Many decisions carry different needs,<br />hopes, and fears within them.
          </p>
          <div className="w-8 h-px bg-white/15 mx-auto" />
          <p className="text-white/80 text-sm leading-relaxed">
            Before you leave this space, take a gentle moment with yourself.
            Looking closely at a decision is not always easy.
            It takes honesty, courage, and care.
            You've taken the time to listen to your thoughts, emotions, and what matters most to you.
          </p>
          <p className="text-white font-medium text-sm">
            What are you committing to from here?
          </p>
        </div>

        {/* Commitment input */}
        <div>
          <input
            type="text"
            value={commitment}
            onChange={e => setCommitment(e.target.value.slice(0, 200))}
            placeholder='Type: "I commit to taking this step by:"'
            className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        {/* Add to Calendar — both Google and Apple/Outlook */}
        {reviewDate && (
          <CalendarButtons
            title={calendarTitle}
            date={reviewDate}
            description={calendarDescription}
          />
        )}
      </div>

      {/* Footer — Back / Done */}
      <div className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-4 bg-gradient-to-t from-[#1a0826] via-[#1a0826]/80 to-transparent flex gap-3">
        <button
          onClick={() => setPhase('review_date')}
          className="flex-1 py-3.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/35 text-sm font-medium transition-all"
        >
          Back
        </button>
        <button
          onClick={handleFinish}
          className="flex-1 py-3.5 rounded-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] text-sm font-semibold transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )
}
