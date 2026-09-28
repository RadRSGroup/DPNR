'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, OptionLabel, PRESET_TAGS } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'

interface Step06Props {
  decisionTitle: string
  /** A, B and (2026-09-28 #2) an optional C. */
  options: DecisionOption[]
  initialValues?: Partial<Record<OptionLabel, string[]>>
  initialNeeds?: Partial<Record<OptionLabel, string[]>>
  onRefine: RefineFn
  onComplete: (values: Partial<Record<OptionLabel, string[]>>, needs: Partial<Record<OptionLabel, string[]>>) => void
  onBack?: () => void
  onSkip?: () => void
}

type Round = 'values' | 'needs'

const ROUNDS: { round: Round; label: string }[] = [
  { round: 'values', label: 'Values' },
  { round: 'needs',  label: 'Needs' },
]

export default function Step06({ decisionTitle, options, initialValues, initialNeeds, onRefine, onComplete, onBack, onSkip }: Step06Props) {
  const [roundIdx, setRoundIdx] = useState(0)
  const [optionIdx, setOptionIdx] = useState(0)
  const [selected, setSelected] = useState<Partial<Record<OptionLabel, Record<Round, string[]>>>>(() =>
    Object.fromEntries(options.map((o) => [o.label, { values: initialValues?.[o.label] ?? [], needs: initialNeeds?.[o.label] ?? [] }]))
  )
  const [suggestedByOption, setSuggestedByOption] = useState<Partial<Record<OptionLabel, { values: string[]; needs: string[] }>>>({})
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const currentRound = ROUNDS[roundIdx]
  const isLastRound = roundIdx === ROUNDS.length - 1
  const currentOption = options[optionIdx].label
  const isLastOption = optionIdx === options.length - 1
  const suggested = suggestedByOption[currentOption] ?? { values: [], needs: [] }

  // Suggestions once per option (a REFINE is a paid call).
  useEffect(() => {
    if (suggestedByOption[currentOption]) return
    let ignore = false
    const opt = currentOption
    callAI<{ values: string[]; needs: string[] }>('values_needs_tags', { optionLabel: opt }).then((res) => {
      if (!ignore && res) setSuggestedByOption((prev) => ({ ...prev, [opt]: res }))
    })
    return () => { ignore = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  function toggle(item: string) {
    setSelected(prev => {
      const current = prev[currentOption] ?? { values: [], needs: [] }
      const arr = current[currentRound.round]
      return {
        ...prev,
        [currentOption]: {
          ...current,
          [currentRound.round]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
        },
      }
    })
  }

  function handleNext() {
    if (!isLastOption) {
      setOptionIdx(i => i + 1)
    } else if (!isLastRound) {
      setRoundIdx(i => i + 1)
      setOptionIdx(0)
    } else {
      const pick = (round: Round) => Object.fromEntries(options.map((o) => [o.label, selected[o.label]?.[round] ?? []]))
      onComplete(pick('values'), pick('needs'))
    }
  }

  function addCustom() {
    if (!customInput.trim()) return
    toggle(customInput.trim())
    setCustomInput('')
  }

  const presetKey = currentRound.round === 'values' ? 'value' : 'need'
  const currentSelected = selected[currentOption]?.[currentRound.round] ?? []
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

  const ctaLabel = !isLastOption
    ? `Option ${options[optionIdx + 1].label}: ${currentRound.label}`
    : isLastRound
    ? 'Next step'
    : `Next: ${ROUNDS[roundIdx + 1].label}`

  return (
    <StepShell step={6} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        <OptionContext options={options} active={currentOption} />

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
