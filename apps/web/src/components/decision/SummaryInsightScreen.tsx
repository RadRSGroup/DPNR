'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import { useAI, RefineFn } from '@/lib/useAI'

interface SummaryInsightScreenProps {
  decisionTitle: string
  onRefine: RefineFn
  onContinue: () => void
  onBack: () => void
}

type Agreement = 'accurate' | 'refine' | 'not_sure' | 'partly_true'

const AGREEMENT_OPTIONS: { key: Agreement; label: string }[] = [
  { key: 'accurate',    label: 'Accurate' },
  { key: 'refine',      label: 'Refine this' },
  { key: 'not_sure',    label: 'Not sure' },
  { key: 'partly_true', label: 'Partly True' },
]

export default function SummaryInsightScreen({
  decisionTitle, onRefine,
  onContinue, onBack,
}: SummaryInsightScreenProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const { callAI, loading } = useAI(onRefine)

  useEffect(() => {
    let ignore = false
    async function fetchInsight() {
      // SUMMARY_INSIGHT's REFINE re-derives everything server-side — no client input needed.
      const res = await callAI<{ insight: string }>('summary_insight', {})
      if (!ignore && res?.insight) setInsight(res.insight)
    }
    fetchInsight()
    return () => { ignore = true }
    // Runs once on mount by design — this screen is mounted fresh per step, and callAI isn't
    // memoized, so including the full dep list would re-fire the AI call on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <StepShell step={9} decisionTitle={decisionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-2 pb-2">

        {/* Section label */}
        <p className="text-purple-400 text-xs uppercase tracking-widest text-center pb-3">Your Story</p>

        {/* Insight card */}
        <div className="flex-1 flex flex-col justify-center space-y-5">
          <div className="bg-white/8 backdrop-blur-sm border border-white/12 rounded-3xl px-5 py-7 space-y-5">

            {/* Fixed opener line with bold keywords */}
            <p className="text-white text-sm text-center leading-relaxed">
              You explored this decision through your{' '}
              <strong className="text-white font-semibold">body, thoughts, fears, and values.</strong>
            </p>

            {/* AI insight */}
            {loading && !insight ? (
              <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating your insight…
              </div>
            ) : (
              <p className="text-white/75 text-sm text-center leading-relaxed">
                {insight}
              </p>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-white/10" />
              <p className="text-white/30 text-xs">Do You Agree?</p>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Agreement options */}
            <div className="grid grid-cols-2 gap-2.5">
              {AGREEMENT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAgreement(key)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-sm transition-all ${
                    agreement === key
                      ? 'border-purple-500/70 bg-purple-900/30 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    agreement === key ? 'border-purple-400 bg-purple-500' : 'border-white/30'
                  }`}>
                    {agreement === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/35 text-sm font-medium transition-all"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={!agreement || !insight}
            className="flex-1 py-3.5 rounded-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Supporting Yourself
          </button>
        </div>
      </div>
    </StepShell>
  )
}
