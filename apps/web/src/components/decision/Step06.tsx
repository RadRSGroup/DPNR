'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, PRESET_TAGS } from '@/lib/types'

interface Step06Props {
  decisionTitle: string
  decisionId?: string
  optionA: DecisionOption
  optionB: DecisionOption
  initialValuesA?: string[]
  initialNeedsA?: string[]
  initialValuesB?: string[]
  initialNeedsB?: string[]
  onComplete: (valuesA: string[], needsA: string[], valuesB: string[], needsB: string[]) => void
  onBack?: () => void
  onSkip?: () => void
}

type Round = 'values' | 'needs'

const ROUNDS: { round: Round; label: string; icon: string }[] = [
  { round: 'values', label: 'Values', icon: '💎' },
  { round: 'needs',  label: 'Needs',  icon: '🫀' },
]

export default function Step06({ decisionTitle, decisionId, optionA, optionB, initialValuesA, initialNeedsA, initialValuesB, initialNeedsB, onComplete, onBack, onSkip }: Step06Props) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [selected, setSelected] = useState<Record<string, Record<Round, string[]>>>({
    A: { values: initialValuesA ?? [], needs: initialNeedsA ?? [] },
    B: { values: initialValuesB ?? [], needs: initialNeedsB ?? [] },
  })
  const [suggestedA, setSuggestedA] = useState<{ values: string[]; needs: string[] }>({ values: [], needs: [] })
  const [suggestedB, setSuggestedB] = useState<{ values: string[]; needs: string[] }>({ values: [], needs: [] })
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

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
      { optionLabel: o.label, optionText: o.content },
      decisionId
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
    ? `Option B: ${currentRound.label} →`
    : isLastRound
    ? 'Next Step →'
    : `Next: ${ROUNDS[roundIdx + 1].label} →`

  return (
    <StepShell step={6} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        {/* Option cards */}
        <div className="grid grid-cols-2 gap-2">
          {(['A', 'B'] as const).map(label => (
            <div
              key={label}
              className={`rounded-xl border p-3 transition-all ${
                currentOption === label
                  ? 'border-purple-600/60 bg-purple-900/20'
                  : 'border-white/10 bg-white/5 opacity-40'
              }`}
            >
              <p className="text-purple-400 text-xs mb-1">Option {label}</p>
              <p className="text-white/60 text-xs line-clamp-2">
                {label === 'A' ? optionA.content : optionB.content}
              </p>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-purple-900/40 border border-purple-600/40 rounded-full px-3 py-1 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            {currentRound.icon} {currentRound.label} — Option {currentOption}
          </span>
          <div className="flex-1 h-px bg-white/8" />
          <div className="flex items-center gap-1.5">
            {ROUNDS.map((r, i) => (
              <div key={r.round} className={`h-1.5 rounded-full transition-all ${
                i < roundIdx ? 'bg-purple-400 w-4' : i === roundIdx ? 'bg-fuchsia-300 w-5' : 'bg-white/15 w-3'
              }`} />
            ))}
          </div>
        </div>

        <p className="text-white/60 text-sm text-center leading-relaxed">{prompt}</p>

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
          {loading && (
            <p className="text-purple-400/50 text-xs w-full text-center animate-pulse pt-2">
              ✦ Loading AI suggestions...
            </p>
          )}
        </div>

        {/* Custom input */}
        <div className="flex gap-2">
          <input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            placeholder="Add your own..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-purple-500/50"
          />
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
