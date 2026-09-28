'use client'
import { useState, useRef } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, OptionLabel } from '@/lib/types'
import Dictatable from '@/components/ui/Dictatable'

interface Step02Props {
  decisionTitle: string
  tier?: string
  initialNarrative?: string
  initialOptionA?: DecisionOption
  initialOptionB?: DecisionOption
  initialOptionC?: DecisionOption
  onRefine: RefineFn
  /** Two options, or three when the person kept an Option C (2026-09-28 #2). */
  onComplete: (narrative: string, options: DecisionOption[]) => void
  onBack?: () => void
  onSkip?: () => void
}

// One limit for everyone (Session 68: was 500/1500/3000 by plan tier; the
// user raised every room text box to 5000).
const CHAR_LIMIT = 5000

const emptyOption = (label: OptionLabel): DecisionOption => ({ label, content: '', approved: false })

export default function Step02({ decisionTitle, initialNarrative = '', initialOptionA, initialOptionB, initialOptionC, onRefine, onComplete, onBack, onSkip }: Step02Props) {
  const [narrative, setNarrative] = useState(initialNarrative)
  const [optionA, setOptionA] = useState<DecisionOption>(initialOptionA ?? emptyOption('A'))
  const [optionB, setOptionB] = useState<DecisionOption>(initialOptionB ?? emptyOption('B'))
  // Optional third option (#2): DPNR drafts one only when the story clearly
  // names a third path; the person can also add or remove it themselves.
  const [optionC, setOptionC] = useState<DecisionOption | null>(initialOptionC ?? null)
  const [parsed, setParsed] = useState(!!(initialOptionA?.content && initialOptionB?.content))
  const { callAI, loading, error, tokenCapReached, dismissTokenCap } = useAI(onRefine)
  const charLimit = CHAR_LIMIT

  async function handleParse() {
    const res = await callAI<{ optionA: string; optionB: string; optionC?: string }>(
      'parse_options', { narrative }
    )
    if (res) {
      setOptionA({ label: 'A', content: res.optionA, approved: false })
      setOptionB({ label: 'B', content: res.optionB, approved: false })
      setOptionC(res.optionC?.trim() ? { label: 'C', content: res.optionC, approved: false } : null)
      setParsed(true)
    }
  }

  function toggleApproved(prev: DecisionOption): DecisionOption {
    return { ...prev, approved: !prev.approved }
  }

  function canContinue() {
    return parsed && optionA.approved && optionB.approved && (!optionC || optionC.approved)
  }

  return (
    <StepShell step={2} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        {!parsed ? (
          /* Narrative input */
          <div className="flex-1 flex flex-col space-y-3">
            <p className="text-white/60 text-sm text-center">
              Tell me about this decision. Write freely: what&apos;s happening, what makes it hard?
            </p>
            <Dictatable className="flex-1 flex flex-col">
              <textarea
                value={narrative}
                onChange={e => setNarrative(e.target.value.slice(0, charLimit))}
                placeholder="Write your story here..."
                className="flex-1 w-full min-h-[200px] bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <div className="flex justify-between items-center">
              <span className="text-white/20 text-xs">{narrative.length}/{charLimit} chars</span>
            </div>
            {error && error !== 'token_cap_reached' && (
              <p className="text-red-400 text-xs text-center">AI error: {error}. Please try again.</p>
            )}
            <PrimaryButton
              label="Find My Options"
              onClick={handleParse}
              disabled={narrative.trim().length < 30}
              loading={loading}
            />
          </div>
        ) : (
          /* Options cards */
          <div className="flex-1 flex flex-col space-y-3">
            <OptionCard
              label="Option A"
              option={optionA}
              onEdit={val => setOptionA(prev => ({ ...prev, content: val, approved: false }))}
              onApprove={() => setOptionA(toggleApproved)}
            />

            <OptionCard
              label="Option B"
              option={optionB}
              onEdit={val => setOptionB(prev => ({ ...prev, content: val, approved: false }))}
              onApprove={() => setOptionB(toggleApproved)}
            />

            {optionC ? (
              <OptionCard
                label="Option C"
                option={optionC}
                onEdit={val => setOptionC(prev => prev && ({ ...prev, content: val, approved: false }))}
                onApprove={() => setOptionC(prev => prev && toggleApproved(prev))}
                onRemove={() => setOptionC(null)}
                startEditing={!optionC.content}
              />
            ) : (
              <button
                onClick={() => setOptionC(emptyOption('C'))}
                className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/60 hover:text-white/85 hover:border-white/35 text-sm transition-colors"
              >
                + Add a third option
              </button>
            )}

            {/* Re-parse */}
            <button
              onClick={() => setParsed(false)}
              className="text-[var(--color-text-tertiary)] hover:text-white/50 text-xs text-center transition-colors"
            >
              Rewrite the whole story
            </button>

            <PrimaryButton
              label="Continue process"
              onClick={() => onComplete(narrative, optionC ? [optionA, optionB, optionC] : [optionA, optionB])}
              disabled={!canContinue()}
            />
          </div>
        )}
      </div>
    </StepShell>
  )
}

/**
 * One option DPNR drafted. Rewrite (founder feedback 2026-09-28 #3) no
 * longer empties the field: it opens the same text for editing with the
 * cursor at the end, and keeps DPNR's original wording visible underneath
 * in a softer line so a small correction stays small. Clearing the text is
 * a separate, explicit choice.
 */
function OptionCard({
  label, option, onEdit, onApprove, onRemove, startEditing = false,
}: {
  label: string
  option: DecisionOption
  onEdit: (v: string) => void
  onApprove: () => void
  /** Only the optional Option C can be removed. */
  onRemove?: () => void
  /** A new, empty option opens ready to write in. */
  startEditing?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(startEditing)
  const [original, setOriginal] = useState<string | null>(null)

  function handleRewrite() {
    setOriginal(option.content)
    setEditing(true)
    setTimeout(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }, 0)
  }

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all duration-(--motion-calm) ${
      option.approved
        ? 'bg-white/[0.07] border-[var(--color-amber-300)]/50'
        : editing
          ? 'bg-white/[0.06] border-[var(--color-violet-400)]/50'
          : 'bg-white/5 border-white/15'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[var(--color-amber-300)] text-[11px] uppercase tracking-[0.18em]">{label}</p>
        {onRemove && (
          <button onClick={onRemove} className="text-white/45 hover:text-white/75 text-xs underline underline-offset-2 transition-colors">
            Remove
          </button>
        )}
      </div>
      <Dictatable>
        <textarea
          ref={textareaRef}
          value={option.content}
          onChange={e => onEdit(e.target.value)}
          disabled={option.approved}
          rows={3}
          placeholder="Describe this option in your own words..."
          className="w-full bg-transparent text-white/90 text-sm lg:text-base leading-relaxed resize-none focus:outline-none placeholder-[var(--color-text-tertiary)] disabled:opacity-80 pe-10"
        />
      </Dictatable>
      {editing && original !== null && original !== option.content && (
        <div className="rounded-xl bg-black/20 px-3 py-2 text-xs text-white/50 leading-relaxed animate-fade-in">
          <span className="text-white/40">DPNR suggested: </span>{original}
          <button onClick={() => onEdit(original)} className="ms-2 underline underline-offset-2 text-white/60 hover:text-white/85">
            Use this again
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {editing ? (
          <button
            onClick={() => { onEdit(''); textareaRef.current?.focus() }}
            disabled={option.approved || !option.content}
            className="flex-1 py-2 rounded-full border border-white/15 text-white/55 hover:text-white/80 text-xs transition-colors disabled:opacity-40"
          >
            Clear and start over
          </button>
        ) : (
          <button
            onClick={handleRewrite}
            disabled={option.approved}
            className="flex-1 py-2 rounded-full border border-[var(--color-violet-400)]/50 text-[var(--color-violet-200)] hover:bg-white/[0.06] text-xs transition-colors disabled:opacity-40"
          >
            Rewrite
          </button>
        )}
        <button
          onClick={() => { setEditing(false); onApprove() }}
          disabled={!option.content.trim()}
          className={`flex-1 py-2 rounded-full text-xs transition-all disabled:opacity-40 ${
            option.approved
              ? 'bg-[var(--color-violet-600)] border border-[var(--color-violet-500)] text-white'
              : 'border border-white/20 text-white/70 hover:border-white/40'
          }`}
        >
          {option.approved ? 'Approved' : 'Approve'}
        </button>
      </div>
    </div>
  )
}
