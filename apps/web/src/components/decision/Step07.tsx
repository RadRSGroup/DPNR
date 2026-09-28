'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import { staggerClass } from '@/lib/motion'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'
interface Step07Props {
  decisionTitle: string
  optionA: DecisionOption
  optionB: DecisionOption
  initialSelectedA?: string[]
  initialSelectedB?: string[]
  initialChosenLean?: string
  initialReflectionNote?: string
  onRefine: RefineFn
  onComplete: (projectionsA: string[], projectionsB: string[], chosenLean?: string, reflectionNote?: string) => void
  onBack?: () => void
  onSkip?: () => void
}

type Phase = 'projections' | 'reflect'

export default function Step07({
  decisionTitle, optionA, optionB,
  initialSelectedA, initialSelectedB, initialChosenLean, initialReflectionNote,
  onRefine, onComplete, onBack, onSkip
}: Step07Props) {
  const [phase, setPhase] = useState<Phase>('projections')
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [statementsA, setStatementsA] = useState<string[]>(initialSelectedA ?? [])
  const [statementsB, setStatementsB] = useState<string[]>(initialSelectedB ?? [])
  const [selectedA, setSelectedA] = useState<string[]>(initialSelectedA ?? [])
  const [selectedB, setSelectedB] = useState<string[]>(initialSelectedB ?? [])
  const [customA, setCustomA] = useState('')
  const [customB, setCustomB] = useState('')

  const [chosenLean, setChosenLean] = useState<'A' | 'B' | 'undecided' | null>(
    (initialChosenLean as 'A' | 'B' | 'undecided' | null) ?? null
  )
  const [reflectionNote, setReflectionNote] = useState(initialReflectionNote ?? '')

  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const statements = currentOption === 'A' ? statementsA : statementsB
  const selected = currentOption === 'A' ? selectedA : selectedB
  const setSelected = currentOption === 'A' ? setSelectedA : setSelectedB

  useEffect(() => {
    let ignore = false
    async function fetchProjections(label: 'A' | 'B') {
      const res = await callAI<{ statements: string[] }>(
        'future_projection',
        { optionLabel: label }
      )
      if (!ignore && res?.statements) {
        if (label === 'A') setStatementsA(res.statements)
        else setStatementsB(res.statements)
      }
    }
    if (currentOption === 'A' && statementsA.length === 0) fetchProjections('A')
    if (currentOption === 'B' && statementsB.length === 0) fetchProjections('B')
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

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
    onComplete(selectedA, selectedB, chosenLean ?? undefined, reflectionNote.trim() || undefined)
  }

  /* ── Phase: projections ── */
  if (phase === 'projections') {
    return (
      <StepShell step={7} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
        {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
        <div className="flex-1 flex flex-col space-y-4 pt-2">
          <OptionContext optionA={optionA} optionB={optionB} active={currentOption} />

          {/* The prompt as an intentional transition, not body text (#12). */}
          <div key={currentOption} className="animate-settle-in py-2 lg:py-4">
            <RoomHeading eyebrow={`Future Projection · Option ${currentOption}`} title={`Imagine your life one year from now, having chosen Option ${currentOption}.`} as="h2">
              Which of these futures feel true? Choose any that resonate, or add your own.
            </RoomHeading>
          </div>

          <div className="flex-1 space-y-2 no-scrollbar overflow-y-auto">
            {loading && statements.length === 0 ? (
              <AiThinking shape="cards" count={3} label="Imagining your future…" />
            ) : (
              statements.map((s, i) => (
                <button
                  key={s}
                  onClick={() => toggleStatement(s)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all animate-settle-in ${staggerClass(i)} ${
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
                  <span className={`text-sm lg:text-base leading-snug ${selected.includes(s) ? 'text-white/90' : 'text-white/70'}`}>
                    {s}
                  </span>
                </button>
              ))
            )}

            {!loading && (
              // Was previously gated on statements.length > 0, which left no
              // way to add a projection at all once loading finished with
              // zero AI-suggested statements (the current live stub returns
              // an empty array for this prompt) — the FUTURE_PROJECTION step
              // requires at least one statement per option, so that was a
              // genuine dead end, not just a missed AI suggestion.
              <div className="flex gap-2 pt-1">
                <Dictatable single className="flex-1 min-w-0">
                <input
                  value={currentOption === 'A' ? customA : customB}
                  onChange={e => currentOption === 'A' ? setCustomA(e.target.value) : setCustomB(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom()}
                  placeholder="Something else?"
                  className="w-full bg-white/5 border border-white/10 rounded-full px-3 py-2 text-white text-sm placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-purple-500/50"
                />
                </Dictatable>
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
            label={currentOption === 'A' ? 'Next: Option B' : 'Reflect on your decision'}
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
      <StepShell step={7} decisionTitle={decisionTitle} onBack={() => setPhase('projections')} onSkip={handleReflectNext}>
        <div className="flex-1 flex flex-col space-y-6 pt-2">
          <RoomHeading eyebrow="Future Projection · Reflect" title="You've mapped both paths." as="h2">
            Now let it settle. Which option leans closer to your truth?
          </RoomHeading>

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
                  <p className="text-[var(--color-amber-300)] text-[11px] uppercase tracking-[0.18em]">Option {label}</p>
                  <p className="text-white/80 text-sm leading-snug line-clamp-3">{opt.content}</p>
                  {projSelected.length > 0 && (
                    <p className="text-[var(--color-text-tertiary)] text-xs">{projSelected.length} futures resonated</p>
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
                : 'border-white/10 text-[var(--color-text-tertiary)] hover:border-white/20 hover:text-white/60'
            }`}
          >
            Still undecided, and that&apos;s okay
          </button>

          {/* One-line reflection */}
          <div className="space-y-2">
            <p className="text-white/70 text-sm text-center">In one sentence, what feels true right now? <span className="text-[var(--color-text-tertiary)]">(optional)</span></p>
            <Dictatable>
              <textarea
                value={reflectionNote}
                onChange={e => setReflectionNote(e.target.value.slice(0, 5000))}
                placeholder="Something in me knows..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </Dictatable>
          </div>

          <PrimaryButton
            label="Continue"
            onClick={handleReflectNext}
            disabled={!chosenLean}
          />
        </div>
      </StepShell>
    )
  }

  /* ── Phase 7b: final commitment ── */
  // reflect phase — fallthrough (handled above)
  return null
}
