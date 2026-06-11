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
  onComplete: (valuesA: string[], needsA: string[], valuesB: string[], needsB: string[]) => void
  onBack?: () => void
  onSkip?: () => void
}

type Round = 'values' | 'needs'

export default function Step06({ decisionTitle, decisionId, optionA, optionB, onComplete, onBack, onSkip }: Step06Props) {
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [round, setRound] = useState<Round>('values')
  const [selected, setSelected] = useState<Record<string, Record<Round, string[]>>>({
    A: { values: [], needs: [] },
    B: { values: [], needs: [] },
  })
  const [suggested, setSuggested] = useState<{ values: string[]; needs: string[] }>({ values: [], needs: [] })
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  const option = currentOption === 'A' ? optionA : optionB

  useEffect(() => { fetchSuggestions() }, [currentOption])

  async function fetchSuggestions() {
    const res = await callAI<{ values: string[]; needs: string[] }>(
      'values_needs_tags',
      { optionLabel: option.label, optionText: option.content },
      decisionId
    )
    if (res) setSuggested(res)
  }

  function toggle(item: string) {
    setSelected(prev => {
      const arr = prev[currentOption][round]
      return {
        ...prev,
        [currentOption]: {
          ...prev[currentOption],
          [round]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
        },
      }
    })
  }

  function handleNext() {
    if (round === 'values') {
      setRound('needs')
    } else if (currentOption === 'A') {
      setCurrentOption('B')
      setRound('values')
    } else {
      onComplete(
        selected.A.values, selected.A.needs,
        selected.B.values, selected.B.needs
      )
    }
  }

  function addCustom() {
    if (!customInput.trim()) return
    toggle(customInput.trim())
    setCustomInput('')
  }

  const presetKey = round === 'values' ? 'value' : 'need'
  const currentSelected = selected[currentOption][round]
  const items = [
    ...(suggested[round] ?? []),
    ...PRESET_TAGS[presetKey],
    ...currentSelected.filter(t =>
      !(suggested[round] ?? []).includes(t) &&
      !PRESET_TAGS[presetKey].includes(t)
    ),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const prompt = round === 'values'
    ? `Select which values are most important to you per Option ${currentOption}.`
    : `Select which needs are associated with Option ${currentOption}.`

  const ctaLabel = round === 'values'
    ? 'Choose Needs →'
    : currentOption === 'A'
    ? 'Next Option →'
    : 'Next Step →'

  return (
    <StepShell step={6} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        {/* Option toggle */}
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

        <p className="text-white/60 text-sm text-center leading-relaxed">{prompt}</p>

        {/* Section header */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 bg-purple-900/40 border border-purple-600/40 rounded-full px-3 py-1 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            {round === 'values' ? '💎 Values' : '🫀 Needs'}
          </span>
          <div className="flex-1 h-px bg-white/8" />
          {/* Sub-step dots */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${round === 'values' ? 'bg-purple-400' : 'bg-white/20'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${round === 'needs' ? 'bg-purple-400' : 'bg-white/20'}`} />
          </div>
        </div>

        {/* Chip grid */}
        <div className="flex-1 flex flex-wrap gap-2 content-start no-scrollbar overflow-y-auto">
          {items.map(item => (
            <Chip
              key={item}
              label={item}
              selected={selected[currentOption][round].includes(item)}
              aiSuggested={(suggested[round] ?? []).includes(item)}
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

        <PrimaryButton label={ctaLabel} onClick={handleNext} />
      </div>
    </StepShell>
  )
}
