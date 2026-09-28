'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, PRESET_TAGS } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'

interface Step06Props {
  decisionTitle: string
  optionA: DecisionOption
  optionB: DecisionOption
  initialValuesA?: string[]
  initialNeedsA?: string[]
  initialValuesB?: string[]
  initialNeedsB?: string[]
  onRefine: RefineFn
  onComplete: (valuesA: string[], needsA: string[], valuesB: string[], needsB: string[]) => void
  onBack?: () => void
  onSkip?: () => void
}

type Round = 'values' | 'needs'

const ROUNDS: { round: Round; label: string }[] = [
  { round: 'values', label: 'Values' },
  { round: 'needs',  label: 'Needs' },
]

export default function Step06({ decisionTitle, optionA, optionB, initialValuesA, initialNeedsA, initialValuesB, initialNeedsB, onRefine, onComplete, onBack, onSkip }: Step06Props) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [selected, setSelected] = useState<Record<string, Record<Round, string[]>>>({
    A: { values: initialValuesA ?? [], needs: initialNeedsA ?? [] },
    B: { values: initialValuesB ?? [], needs: initialNeedsB ?? [] },
  })
  const [suggestedA, setSuggestedA] = useState<{ values: string[]; needs: string[] }>({ values: [], needs: [] })
  const [suggestedB, setSuggestedB] = useState<{ values: string[]; needs: string[] }>({ values: [], needs: [] })
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const currentRound = ROUNDS[roundIdx]
  const isLastRound = roundIdx === ROUNDS.length - 1
  const suggested = currentOption === 'A' ? suggestedA : suggestedB

  useEffect(() => {
    fetchSuggestions(currentOption)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  async function fetchSuggestions(opt: 'A' | 'B') {
    const o = opt === 'A' ? optionA : optionB
    const res = await callAI<{ values: string[]; needs: string[] }>(
      'values_needs_tags',
      { optionLabel: o.label }
    )
    if (res) {
      const setter = opt === 'A' ? setSuggestedA : setSuggestedB
      setter(res)
    }
  }

  function toggle(item: string) {
    setSelected(prev => {
      const arr = prev[currentOption][currentRound.round]
      return {
        ...prev,
        [currentOption]: {
          ...prev[currentOption],
          [currentRound.round]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
        },
      }
    })
  }

  function handleNext() {
    if (currentOption === 'A') {
      setCurrentOption('B')
      if (Object.values(suggestedB).every(a => a.length === 0)) fetchSuggestions('B')
    } else if (!isLastRound) {
      setRoundIdx(i => i + 1)
      setCurrentOption('A')
    } else {
      onComplete(selected.A.values, selected.A.needs, selected.B.values, selected.B.needs)
    }
  }

  function addCustom() {
    if (!customInput.trim()) return
    toggle(customInput.trim())
    setCustomInput('')
  }

  const presetKey = currentRound.round === 'values' ? 'value' : 'need'
  const currentSelected = selected[currentOption][currentRound.round]
  const canAdvance = currentSelected.length > 0

  const items = [
    ...(suggested[currentRound.round] ?? []),
    ...PRESET_TAGS[presetKey],
    ...currentSelected.filter(t =>
      !(suggested[currentRound.round] ?? []).includes(t) &&
      !PRESET_TAGS[presetKey].includes(t)
    ),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const prompt = currentRound.round === 'values'
    ? `Which values does Option ${currentOption} honour most?`
    : `Which of the 6 core needs does Option ${currentOption} fulfil?`

  const ctaLabel = currentOption === 'A'
    ? `Option B: ${currentRound.label}`
    : isLastRound
    ? 'Next step'
    : `Next: ${ROUNDS[roundIdx + 1].label}`

  return (
    <StepShell step={6} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        <OptionContext optionA={optionA} optionB={optionB} active={currentOption} />

        {/* Lens + round heading (#10/#14), with the round's progress. */}
        <div key={`${roundIdx}-${currentOption}`} className="animate-settle-in space-y-3">
          <RoomHeading eyebrow={`Values & Needs · ${currentRound.label} · Option ${currentOption}`} title={prompt} />
          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {ROUNDS.map((r, i) => (
              <div key={r.round} className={`h-1.5 rounded-full transition-all ${
                i < roundIdx ? 'bg-[var(--color-amber-300)]/70 w-4' : i === roundIdx ? 'bg-[var(--color-amber-300)] w-6' : 'bg-white/15 w-3'
              }`} />
            ))}
          </div>
        </div>

        {/* Chip grid */}
        <div className="flex-1 flex flex-wrap gap-2 content-start no-scrollbar overflow-y-auto">
          {items.map(item => (
            <Chip
              key={item}
              label={item}
              selected={currentSelected.includes(item)}
              aiSuggested={(suggested[currentRound.round] ?? []).includes(item)}
              onClick={() => toggle(item)}
            />
          ))}
          {loading && <AiThinking shape="chips" count={5} label="Finding suggestions…" className="pt-2" />}
        </div>

        {/* Custom input */}
        <div className="flex gap-2">
          <Dictatable single className="flex-1 min-w-0">
          <input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="Add your own..."
            className="w-full bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-purple-500/50"
          />
          </Dictatable>
          <button
            onClick={addCustom}
            className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs hover:bg-purple-800/40 transition-colors"
          >
            Add
          </button>
        </div>

        <PrimaryButton label={ctaLabel} onClick={handleNext} disabled={!canAdvance} />
      </div>
    </StepShell>
  )
}
