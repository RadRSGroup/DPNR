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
  const sections = lens === 'pros_cons'
    ? [{ type: 'pro', label: 'Pros', icon: '✓' }, { type: 'con', label: 'Cons', icon: '✗' }]
    : [{ type: 'desire', label: 'Desires', icon: '✦' }, { type: 'fear', label: 'Fears', icon: '⚡' }]

  const [sectionIdx, setSectionIdx] = useState(0)
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [tagsA, setTagsA] = useState<Record<string, string[]>>({ pro: [], con: [], desire: [], fear: [] })
  const [tagsB, setTagsB] = useState<Record<string, string[]>>({ pro: [], con: [], desire: [], fear: [] })
  const [suggestedA, setSuggestedA] = useState<Record<string, string[]>>({})
  const [suggestedB, setSuggestedB] = useState<Record<string, string[]>>({})
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  const currentSection = sections[sectionIdx]
  const isLastSection = sectionIdx === sections.length - 1
  const option = currentOption === 'A' ? optionA : optionB
  const tags = currentOption === 'A' ? tagsA : tagsB
  const setTags = currentOption === 'A' ? setTagsA : setTagsB
  const suggested = currentOption === 'A' ? suggestedA : suggestedB
  const setSuggested = currentOption === 'A' ? setSuggestedA : setSuggestedB

  useEffect(() => {
    fetchSuggestions(currentOption)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  async function fetchSuggestions(opt: 'A' | 'B') {
    const o = opt === 'A' ? optionA : optionB
    if (lens === 'pros_cons') {
      const res = await callAI<{ pros: string[]; cons: string[] }>(
        'pros_cons_tags',
        { optionLabel: o.label, optionText: o.content, narrative },
        decisionId
      )
      if (res) {
        const setter = opt === 'A' ? setSuggestedA : setSuggestedB
        setter({ pro: res.pros, con: res.cons })
      }
    } else if (lens === 'fears_desires') {
      const res = await callAI<{ desires: string[]; fears: string[] }>(
        'fear_desire_tags', { narrative }, decisionId
      )
      if (res) {
        const setter = opt === 'A' ? setSuggestedA : setSuggestedB
        setter({ desire: res.desires, fear: res.fears })
      }
    }
  }

  function toggleTag(type: string, label: string) {
    setTags(prev => {
      const arr = prev[type] ?? []
      return { ...prev, [type]: arr.includes(label) ? arr.filter(t => t !== label) : [...arr, label] }
    })
  }

  function addCustom() {
    if (!customInput.trim()) return
    toggleTag(currentSection.type, customInput.trim())
    setCustomInput('')
  }

  function handleNext() {
    if (currentOption === 'A') {
      // Move to Option B for the same section
      setCurrentOption('B')
      if (!suggestedB || Object.keys(suggestedB).length === 0) fetchSuggestions('B')
    } else if (!isLastSection) {
      // Both options done for this section — move to next section, start with A
      setSectionIdx(i => i + 1)
      setCurrentOption('A')
    } else {
      // All sections done for both options
      onComplete({
        A_pro: tagsA.pro ?? [], A_con: tagsA.con ?? [],
        A_desire: tagsA.desire ?? [], A_fear: tagsA.fear ?? [],
        B_pro: tagsB.pro ?? [], B_con: tagsB.con ?? [],
        B_desire: tagsB.desire ?? [], B_fear: tagsB.fear ?? [],
      })
    }
  }

  const currentTags = tags[currentSection.type] ?? []
  const canAdvance = currentTags.length > 0

  const buttonLabel = currentOption === 'A'
    ? `Option B: ${currentSection.label} →`
    : isLastSection
    ? 'Next Step →'
    : `Next: ${sections[sectionIdx + 1].label} →`

  const promptText = lens === 'pros_cons'
    ? `What are the ${currentSection.label.toLowerCase()} of Option ${currentOption}?`
    : currentSection.type === 'desire'
    ? `What does Option ${currentOption} make you long for?`
    : `What does Option ${currentOption} make you afraid of?`

  const usePresets = currentSection.type === 'desire' || currentSection.type === 'fear'
  const chipList = [
    ...(suggested[currentSection.type] ?? []),
    ...(usePresets ? (PRESET_TAGS[currentSection.type as keyof typeof PRESET_TAGS] ?? []) : []),
    ...currentTags.filter(t =>
      !(suggested[currentSection.type] ?? []).includes(t) &&
      !(usePresets ? PRESET_TAGS[currentSection.type as keyof typeof PRESET_TAGS] ?? [] : []).includes(t)
    ),
  ].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <StepShell step={5} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
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
            {currentSection.icon} {currentSection.label} — Option {currentOption}
          </span>
          <div className="flex-1 h-px bg-white/8" />
          {/* Section progress dots */}
          <div className="flex items-center gap-1.5">
            {sections.map((s, i) => (
              <div key={s.type} className={`h-1.5 rounded-full transition-all ${
                i < sectionIdx ? 'bg-purple-400 w-4' : i === sectionIdx ? 'bg-fuchsia-300 w-5' : 'bg-white/15 w-3'
              }`} />
            ))}
          </div>
        </div>

        <p className="text-white/60 text-sm text-center leading-relaxed">{promptText}</p>

        {/* Chips */}
        <div className="flex-1 no-scrollbar overflow-y-auto space-y-3">
          <div className="chips-row flex-wrap gap-y-2">
            {chipList.map(chip => (
              <Chip
                key={chip}
                label={chip}
                selected={currentTags.includes(chip)}
                aiSuggested={(suggested[currentSection.type] ?? []).includes(chip)}
                onClick={() => toggleTag(currentSection.type, chip)}
              />
            ))}
          </div>

          {loading && (
            <p className="text-purple-400/50 text-xs text-center animate-pulse">
              ✦ Loading AI suggestions...
            </p>
          )}

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
        </div>

        <PrimaryButton label={buttonLabel} onClick={handleNext} disabled={!canAdvance} />
      </div>
    </StepShell>
  )
}
