'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { Lens, DecisionOption, PRESET_TAGS } from '@/lib/types'

interface Step05Props {
  decisionTitle: string
  decisionId?: string
  narrative: string
  optionA: DecisionOption
  optionB: DecisionOption
  lens: Lens
  onComplete: (tags: Record<string, string[]>) => void
  onBack?: () => void
  onSkip?: () => void
}

export default function Step05({ decisionTitle, decisionId, narrative, optionA, optionB, lens, onComplete, onBack, onSkip }: Step05Props) {
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [tagsA, setTagsA] = useState<Record<string, string[]>>({ pro: [], con: [], desire: [], fear: [] })
  const [tagsB, setTagsB] = useState<Record<string, string[]>>({ pro: [], con: [], desire: [], fear: [] })
  const [suggested, setSuggested] = useState<Record<string, string[]>>({})
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  const option = currentOption === 'A' ? optionA : optionB
  const tags = currentOption === 'A' ? tagsA : tagsB
  const setTags = currentOption === 'A' ? setTagsA : setTagsB

  useEffect(() => { fetchSuggestions() }, [currentOption])

  async function fetchSuggestions() {
    if (lens === 'pros_cons') {
      const res = await callAI<{ pros: string[]; cons: string[] }>(
        'pros_cons_tags',
        { optionLabel: option.label, optionText: option.content, narrative },
        decisionId
      )
      if (res) setSuggested({ pro: res.pros, con: res.cons })
    } else if (lens === 'fears_desires') {
      const res = await callAI<{ desires: string[]; fears: string[] }>(
        'fear_desire_tags', { narrative }, decisionId
      )
      if (res) setSuggested({ desire: res.desires, fear: res.fears })
    }
  }

  function toggleTag(type: string, label: string) {
    setTags(prev => {
      const arr = prev[type] ?? []
      return {
        ...prev,
        [type]: arr.includes(label) ? arr.filter(t => t !== label) : [...arr, label],
      }
    })
  }

  function addCustom(type: string) {
    if (!customInput.trim()) return
    toggleTag(type, customInput.trim())
    setCustomInput('')
  }

  function handleNextOption() {
    if (currentOption === 'A') setCurrentOption('B')
    else onComplete({
      A_pro: tagsA.pro ?? [], A_con: tagsA.con ?? [],
      A_desire: tagsA.desire ?? [], A_fear: tagsA.fear ?? [],
      B_pro: tagsB.pro ?? [], B_con: tagsB.con ?? [],
      B_desire: tagsB.desire ?? [], B_fear: tagsB.fear ?? [],
    })
  }

  const sections = lens === 'pros_cons'
    ? [{ type: 'pro', label: 'Pros' }, { type: 'con', label: 'Cons' }]
    : [{ type: 'desire', label: 'Desires' }, { type: 'fear', label: 'Fears' }]

  const promptText = lens === 'pros_cons'
    ? `Select the pros and cons for Option ${option.label}. Choose what feels true for you.`
    : 'Beneath expectations and fear, what do you truly want?'

  return (
    <StepShell step={5} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
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

        <p className="text-white/60 text-sm text-center leading-relaxed">{promptText}</p>

        {/* Tag sections */}
        <div className="flex-1 space-y-5 no-scrollbar overflow-y-auto">
          {sections.map(({ type, label }) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-purple-900/40 border border-purple-600/40 rounded-full px-3 py-1 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                  {type === 'pro' && '✓'}{type === 'con' && '✗'}{type === 'desire' && '✦'}{type === 'fear' && '⚡'} {label}
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              {/* AI suggested + preset + custom chips */}
              <div className="chips-row flex-wrap gap-y-2">
                {[
                  ...(suggested[type] ?? []),
                  ...(PRESET_TAGS[type as keyof typeof PRESET_TAGS] ?? []),
                  ...(tags[type] ?? []).filter(t =>
                    !(suggested[type] ?? []).includes(t) &&
                    !(PRESET_TAGS[type as keyof typeof PRESET_TAGS] ?? []).includes(t)
                  ),
                ]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map(chip => (
                    <Chip
                      key={chip}
                      label={chip}
                      selected={(tags[type] ?? []).includes(chip)}
                      aiSuggested={(suggested[type] ?? []).includes(chip)}
                      onClick={() => toggleTag(type, chip)}
                    />
                  ))
                }
              </div>

              {/* Custom input */}
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustom(type)}
                  placeholder="Add your own..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  onClick={() => addCustom(type)}
                  className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs hover:bg-purple-800/40 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          ))}

          {loading && (
            <p className="text-purple-400/50 text-xs text-center animate-pulse">
              ✦ Loading AI suggestions...
            </p>
          )}
        </div>

        <PrimaryButton
          label={currentOption === 'A' ? 'Next Option →' : 'Next Step →'}
          onClick={handleNextOption}
        />
      </div>
    </StepShell>
  )
}
