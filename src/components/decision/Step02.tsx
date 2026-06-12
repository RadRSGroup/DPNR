'use client'
import { useState, useRef } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption } from '@/lib/types'

interface Step02Props {
  decisionTitle: string
  decisionId?: string
  tier?: string
  initialNarrative?: string
  initialOptionA?: DecisionOption
  initialOptionB?: DecisionOption
  onComplete: (narrative: string, optionA: DecisionOption, optionB: DecisionOption) => void
  onBack?: () => void
  onSkip?: () => void
}

const CHAR_LIMITS: Record<string, number> = { free: 500, core: 1500, pro: 3000 }

export default function Step02({ decisionTitle, decisionId, tier = 'free', initialNarrative = '', initialOptionA, initialOptionB, onComplete, onBack, onSkip }: Step02Props) {
  const [narrative, setNarrative] = useState(initialNarrative)
  const [optionA, setOptionA] = useState<DecisionOption>(initialOptionA ?? { label: 'A', content: '', approved: false })
  const [optionB, setOptionB] = useState<DecisionOption>(initialOptionB ?? { label: 'B', content: '', approved: false })
  const [parsed, setParsed] = useState(!!(initialOptionA?.content && initialOptionB?.content))
  const { callAI, loading, error, tokenCapReached, dismissTokenCap } = useAI()
  const charLimit = CHAR_LIMITS[tier] ?? 500

  async function handleParse() {
    const res = await callAI<{ optionA: string; optionB: string }>(
      'parse_options', { narrative }, decisionId
    )
    if (res) {
      setOptionA({ label: 'A', content: res.optionA, approved: false })
      setOptionB({ label: 'B', content: res.optionB, approved: false })
      setParsed(true)
    }
  }

  function handleApprove(which: 'A' | 'B') {
    if (which === 'A') setOptionA(prev => ({ ...prev, approved: !prev.approved }))
    else setOptionB(prev => ({ ...prev, approved: !prev.approved }))
  }

  function canContinue() {
    return parsed && optionA.approved && optionB.approved
  }

  return (
    <StepShell step={2} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}
      <div className="flex-1 flex flex-col space-y-4 pt-2">

        {!parsed ? (
          /* Narrative input */
          <div className="flex-1 flex flex-col space-y-3">
            <p className="text-white/60 text-sm text-center">
              Tell me about this decision. Write freely — what's happening, what makes it hard?
            </p>
            <textarea
              value={narrative}
              onChange={e => setNarrative(e.target.value.slice(0, charLimit))}
              placeholder="Write your story here..."
              className="flex-1 min-h-[200px] bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <div className="flex justify-between items-center">
              <span className="text-white/20 text-xs">{narrative.length}/{charLimit} chars</span>
              {tier === 'free' && (
                <span className="text-white/30 text-xs">Upgrade for longer narratives</span>
              )}
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
            <p className="text-white/50 text-xs text-center">Step 02: Map the Options</p>

            {/* Option A */}
            <OptionCard
              label="Option A"
              option={optionA}
              onEdit={val => setOptionA(prev => ({ ...prev, content: val, approved: false }))}
              onApprove={() => handleApprove('A')}
            />

            {/* Option B */}
            <OptionCard
              label="Option B"
              option={optionB}
              onEdit={val => setOptionB(prev => ({ ...prev, content: val, approved: false }))}
              onApprove={() => handleApprove('B')}
            />

            {/* Re-parse */}
            <button
              onClick={() => setParsed(false)}
              className="text-white/30 hover:text-white/50 text-xs text-center transition-colors"
            >
              ↺ Rewrite narrative
            </button>

            <PrimaryButton
              label="Continue process"
              onClick={() => onComplete(narrative, optionA, optionB)}
              disabled={!canContinue()}
            />
          </div>
        )}
      </div>
    </StepShell>
  )
}

function OptionCard({
  label, option, onEdit, onApprove,
}: {
  label: string
  option: DecisionOption
  onEdit: (v: string) => void
  onApprove: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleRewrite() {
    onEdit('')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all duration-300 ${
      option.approved
        ? 'bg-purple-900/20 border-purple-600/50'
        : 'bg-white/5 border-white/15'
    }`}>
      <p className="text-purple-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <textarea
        ref={textareaRef}
        value={option.content}
        onChange={e => onEdit(e.target.value)}
        disabled={option.approved}
        rows={3}
        placeholder="Describe this option in your own words..."
        className="w-full bg-transparent text-white/80 text-sm resize-none focus:outline-none placeholder-white/30 disabled:opacity-70"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleRewrite}
          disabled={option.approved}
          className="flex-1 py-2 rounded-full border border-purple-700/50 text-purple-400 hover:bg-purple-900/30 text-xs transition-colors disabled:opacity-40"
        >
          Rewrite
        </button>
        <button
          onClick={onApprove}
          className={`flex-1 py-2 rounded-full text-xs transition-all ${
            option.approved
              ? 'bg-purple-600 border border-purple-500 text-white'
              : 'border border-white/20 text-white/60 hover:border-white/40'
          }`}
        >
          {option.approved ? 'Approved ✓' : 'Approve'}
        </button>
      </div>
    </div>
  )
}
