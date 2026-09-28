'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { Lens, DecisionOption, PRESET_TAGS } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'

interface Step05Props {
  decisionTitle: string
  optionA: DecisionOption
  optionB: DecisionOption
  lens: Lens
  initialTagsA?: Record<string, string[]>
  initialTagsB?: Record<string, string[]>
  onRefine: RefineFn
  onComplete: (tags: Record<string, string[]>) => void
  onBack?: () => void
  onSkip?: () => void
}

export default function Step05({ decisionTitle, optionA, optionB, lens, initialTagsA, initialTagsB, onRefine, onComplete, onBack, onSkip }: Step05Props) {
  const sections = lens === 'pros_cons'
    ? [{ type: 'pro', label: 'Pros' }, { type: 'con', label: 'Cons' }]
    : [{ type: 'desire', label: 'Desires' }, { type: 'fear', label: 'Fears' }]
  // The lens is always named, so moving between layers is visible (#10).
  const lensName = lens === 'pros_cons' ? 'Pros & Cons' : 'Fears & Desires'

  const [sectionIdx, setSectionIdx] = useState(0)
  const [currentOption, setCurrentOption] = useState<'A' | 'B'>('A')
  const [tagsA, setTagsA] = useState<Record<string, string[]>>(initialTagsA ?? { pro: [], con: [], desire: [], fear: [] })
  const [tagsB, setTagsB] = useState<Record<string, string[]>>(initialTagsB ?? { pro: [], con: [], desire: [], fear: [] })
  const [suggestedA, setSuggestedA] = useState<Record<string, string[]>>({})
  const [suggestedB, setSuggestedB] = useState<Record<string, string[]>>({})
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const currentSection = sections[sectionIdx]
  const isLastSection = sectionIdx === sections.length - 1
  const tags = currentOption === 'A' ? tagsA : tagsB
  const setTags = currentOption === 'A' ? setTagsA : setTagsB
  const suggested = currentOption === 'A' ? suggestedA : suggestedB

  useEffect(() => {
    fetchSuggestions(currentOption)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  async function fetchSuggestions(opt: 'A' | 'B') {
    const o = opt === 'A' ? optionA : optionB
    if (lens === 'pros_cons') {
      const res = await callAI<{ pros: string[]; cons: string[] }>(
        'pros_cons_tags',
        { optionLabel: o.label }
      )
      if (res) {
        const setter = opt === 'A' ? setSuggestedA : setSuggestedB
        setter({ pro: res.pros, con: res.cons })
      }
    } else {
      // fears_desires AND values_needs both land here — matches
      // deep-exploration.ts's tagKindForLens. optionLabel is required by
      // the backend's RefineInput even for this branch (a real bug in the
      // pre-port UI: the old /api/ai call never sent it here at all).
      const res = await callAI<{ desires: string[]; fears: string[] }>(
        'fear_desire_tags', { optionLabel: o.label }
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
    ? `Option B: ${currentSection.label}`
    : isLastSection
    ? 'Next step'
    : `Next: ${sections[sectionIdx + 1].label}`

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

        <OptionContext optionA={optionA} optionB={optionB} active={currentOption} />

        {/* Lens + section heading (#10/#14), with the section's progress. */}
        <div key={`${sectionIdx}-${currentOption}`} className="animate-settle-in space-y-3">
          <RoomHeading eyebrow={`${lensName} · ${currentSection.label} · Option ${currentOption}`} title={promptText} />
          <div className="flex items-center justify-center gap-1.5" aria-hidden>
            {sections.map((s, i) => (
              <div key={s.type} className={`h-1.5 rounded-full transition-all ${
                i < sectionIdx ? 'bg-[var(--color-amber-300)]/70 w-4' : i === sectionIdx ? 'bg-[var(--color-amber-300)] w-6' : 'bg-white/15 w-3'
              }`} />
            ))}
          </div>
        </div>

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

          {loading && <AiThinking shape="chips" count={5} label="Finding suggestions…" />}

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
        </div>

        <PrimaryButton label={buttonLabel} onClick={handleNext} disabled={!canAdvance} />
      </div>
    </StepShell>
  )
}
