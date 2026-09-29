'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { Lens, DecisionOption, OptionLabel, PRESET_TAGS } from '@/lib/types'
import AiThinking from '@/components/shared/AiThinking'
import Dictatable from '@/components/ui/Dictatable'
import { OptionContext, RoomHeading } from './RoomHeadings'
import { useDecisionLabels } from '@/lib/decision-labels'

interface Step05Props {
  decisionTitle: string
  /** A, B and (2026-09-28 #2) an optional C. */
  options: DecisionOption[]
  lens: Lens
  initialTags?: Partial<Record<OptionLabel, Record<string, string[]>>>
  onRefine: RefineFn
  /** Per option, the chosen tags by type (pro/con or desire/fear). */
  onComplete: (tags: Partial<Record<OptionLabel, Record<string, string[]>>>) => void
  onBack?: () => void
  onSkip?: () => void
}

const EMPTY_TAGS: Record<string, string[]> = { pro: [], con: [], desire: [], fear: [] }

export default function Step05({ decisionTitle, options, lens, initialTags, onRefine, onComplete, onBack, onSkip }: Step05Props) {
  const t = useTranslations('DecisionRoom')
  const tLens = useTranslations('DecisionLenses')
  const { tag: tagLabel } = useDecisionLabels()
  const sections = lens === 'pros_cons'
    ? [{ type: 'pro', label: t('sections.pro') }, { type: 'con', label: t('sections.con') }]
    : [{ type: 'desire', label: t('sections.desire') }, { type: 'fear', label: t('sections.fear') }]
  // The lens is always named, so moving between layers is visible (#10).
  const lensName = lens === 'pros_cons' ? tLens('prosCons.title') : tLens('fearsDesires.title')

  const [sectionIdx, setSectionIdx] = useState(0)
  const [optionIdx, setOptionIdx] = useState(0)
  const [tagsByOption, setTagsByOption] = useState<Partial<Record<OptionLabel, Record<string, string[]>>>>(() =>
    Object.fromEntries(options.map((o) => [o.label, initialTags?.[o.label] ?? { ...EMPTY_TAGS }]))
  )
  const [suggestedByOption, setSuggestedByOption] = useState<Partial<Record<OptionLabel, Record<string, string[]>>>>({})
  const [customInput, setCustomInput] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  const currentSection = sections[sectionIdx]
  const isLastSection = sectionIdx === sections.length - 1
  const currentOption = options[optionIdx].label
  const isLastOption = optionIdx === options.length - 1
  const tags = tagsByOption[currentOption] ?? EMPTY_TAGS
  const suggested = suggestedByOption[currentOption] ?? {}

  async function fetchSuggestions(opt: OptionLabel) {
    const setSuggested = (value: Record<string, string[]>) => setSuggestedByOption((prev) => ({ ...prev, [opt]: value }))
    if (lens === 'pros_cons') {
      const res = await callAI<{ pros: string[]; cons: string[] }>(
        'pros_cons_tags',
        { optionLabel: opt }
      )
      if (res) setSuggested({ pro: res.pros, con: res.cons })
    } else {
      // fears_desires AND values_needs both land here — matches
      // deep-exploration.ts's tagKindForLens. optionLabel is required by
      // the backend's RefineInput even for this branch (a real bug in the
      // pre-port UI: the old /api/ai call never sent it here at all).
      const res = await callAI<{ desires: string[]; fears: string[] }>(
        'fear_desire_tags', { optionLabel: opt }
      )
      if (res) setSuggested({ desire: res.desires, fear: res.fears })
    }
  }

  useEffect(() => {
    if (!suggestedByOption[currentOption]) fetchSuggestions(currentOption)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOption])

  function toggleTag(type: string, label: string) {
    setTagsByOption(all => {
      const prev = all[currentOption] ?? EMPTY_TAGS
      const arr = prev[type] ?? []
      return { ...all, [currentOption]: { ...prev, [type]: arr.includes(label) ? arr.filter(t => t !== label) : [...arr, label] } }
    })
  }

  function addCustom() {
    if (!customInput.trim()) return
    toggleTag(currentSection.type, customInput.trim())
    setCustomInput('')
  }

  function handleNext() {
    if (!isLastOption) {
      // Next option, same section
      setOptionIdx(i => i + 1)
    } else if (!isLastSection) {
      // Every option done for this section — next section, starting with A
      setSectionIdx(i => i + 1)
      setOptionIdx(0)
    } else {
      return onComplete(tagsByOption)
    }
  }

  const currentTags = tags[currentSection.type] ?? []
  const canAdvance = currentTags.length > 0

  const buttonLabel = !isLastOption
    ? t('optionSection', { label: options[optionIdx + 1].label, section: currentSection.label })
    : isLastSection
    ? t('nextStep')
    : t('nextSection', { section: sections[sectionIdx + 1].label })

  const promptText = lens === 'pros_cons'
    ? (currentSection.type === 'pro' ? t('step05.promptPro', { option: currentOption }) : t('step05.promptCon', { option: currentOption }))
    : currentSection.type === 'desire'
    ? t('step05.promptDesire', { option: currentOption })
    : t('step05.promptFear', { option: currentOption })

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

        <OptionContext options={options} active={currentOption} />

        {/* Lens + section heading (#10/#14), with the section's progress. */}
        <div key={`${sectionIdx}-${currentOption}`} className="animate-settle-in space-y-3">
          <RoomHeading eyebrow={t('step05.eyebrow', { lens: lensName, section: currentSection.label, option: currentOption })} title={promptText} />
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
                label={tagLabel(currentSection.type, chip)}
                selected={currentTags.includes(chip)}
                aiSuggested={(suggested[currentSection.type] ?? []).includes(chip)}
                onClick={() => toggleTag(currentSection.type, chip)}
              />
            ))}
          </div>

          {loading && <AiThinking shape="chips" count={5} label={t('findingSuggestions')} />}

          {/* Custom input */}
          <div className="flex gap-2">
            <Dictatable single className="flex-1 min-w-0">
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustom()}
              placeholder={t('addYourOwn')}
              className="w-full bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-white text-xs placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-purple-500/50"
            />
            </Dictatable>
            <button
              onClick={addCustom}
              className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400 text-xs hover:bg-purple-800/40 transition-colors"
            >
              {t('add')}
            </button>
          </div>
        </div>

        <PrimaryButton label={buttonLabel} onClick={handleNext} disabled={!canAdvance} />
      </div>
    </StepShell>
  )
}
