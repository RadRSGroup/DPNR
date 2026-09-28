'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, OptionLabel } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import { staggerClass } from '@/lib/motion'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'
interface Step07Props {
  decisionTitle: string
  /** A, B and (2026-09-28 #2) an optional C. */
  options: DecisionOption[]
  initialSelected?: Partial<Record<OptionLabel, string[]>>
  initialChosenLean?: string
  initialReflectionNote?: string
  onRefine: RefineFn
  onComplete: (projections: Partial<Record<OptionLabel, string[]>>, chosenLean?: string, reflectionNote?: string) => void
  onBack?: () => void
  onSkip?: () => void
}

type Phase = 'projections' | 'reflect'
type Lean = OptionLabel | 'undecided'
type PerOption<T> = Partial<Record<OptionLabel, T>>

export default function Step07({
  decisionTitle, options,
  initialSelected, initialChosenLean, initialReflectionNote,
  onRefine, onComplete, onBack, onSkip
}: Step07Props) {
  const [phase, setPhase] = useState<Phase>('projections')
  const [optionIdx, setOptionIdx] = useState(0)
  const [statementsByOption, setStatementsByOption] = useState<PerOption<string[]>>(initialSelected ?? {})
  const [selectedByOption, setSelectedByOption] = useState<PerOption<string[]>>(initialSelected ?? {})
  const [customByOption, setCustomByOption] = useState<PerOption<string>>({})

  const [chosenLean, setChosenLean] = useState<Lean | null>(
    options.some((o) => o.label === initialChosenLean) || initialChosenLean === 'undecided' ? (initialChosenLean as Lean) : null
  )
  const [reflectionNote, setReflectionNote] = useState(initialReflectionNote ?? '')

  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const currentOption = options[optionIdx].label
  const isLastOption = optionIdx === options.length - 1
  const statements = statementsByOption[currentOption] ?? []
  const selected = selectedByOption[currentOption] ?? []
  const custom = customByOption[currentOption] ?? ''

  useEffect(() => {
    let ignore = false
    async function fetchProjections(label: OptionLabel) {
      const res = await callAI<{ statements: string[] }>(
        'future_projection',
        { optionLabel: label }
      )
      if (!ignore && res?.statements) setStatementsByOption(prev => ({ ...prev, [label]: res.statements }))
    }
    if ((statementsByOption[currentOption] ?? []).length === 0) fetchProjections(currentOption)
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  function toggleStatement(s: string) {
    setSelectedByOption(prev => {
      const arr = prev[currentOption] ?? []
      return { ...prev, [currentOption]: arr.includes(s) ? arr.filter(i => i !== s) : [...arr, s] }
    })
  }

  function addCustom() {
    const val = custom.trim()
    if (!val) return
    setStatementsByOption(prev => ({ ...prev, [currentOption]: [...(prev[currentOption] ?? []), val] }))
    toggleStatement(val)
    setCustomByOption(prev => ({ ...prev, [currentOption]: '' }))
  }

  function handleProjectionsNext() {
    if (!isLastOption) {
      setOptionIdx(i => i + 1)
    } else {
      setPhase('reflect')
    }
  }

  function handleReflectNext() {
    const projections = Object.fromEntries(options.map((o) => [o.label, selectedByOption[o.label] ?? []]))
    onComplete(projections, chosenLean ?? undefined, reflectionNote.trim() || undefined)
  }

  /* ── Phase: projections ── */
  if (phase === 'projections') {
    return (
      <StepShell step={7} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
        {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
        <div className="flex-1 flex flex-col space-y-4 pt-2">
          <OptionContext options={options} active={currentOption} />

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
                  value={custom}
                  onChange={e => setCustomByOption(prev => ({ ...prev, [currentOption]: e.target.value }))}
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
            label={!isLastOption ? `Next: Option ${options[optionIdx + 1].label}` : 'Reflect on your decision'}
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
          <RoomHeading eyebrow="Future Projection · Reflect" title={options.length > 2 ? "You've mapped all three paths." : "You've mapped both paths."} as="h2">
            Now let it settle. Which option leans closer to your truth?
          </RoomHeading>

          {/* Option lean selector */}
          <div className={`grid gap-3 ${options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
            {options.map(opt => {
              const label = opt.label
              const projSelected = selectedByOption[label] ?? []
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
