'use client'
import { useEffect, useState } from 'react'
import { useAI } from '@/lib/useAI'

interface SummaryInsightScreenProps {
  decisionTitle: string
  narrative: string
  optionA: string
  optionB: string
  allTags: string[]
  decisionId?: string
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
  decisionTitle, narrative, optionA, optionB, allTags, decisionId,
  onContinue, onBack,
}: SummaryInsightScreenProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const { callAI, loading } = useAI()

  useEffect(() => {
    async function fetch() {
      const res = await callAI<{ insight: string }>(
        'summary_insight',
        { decisionTitle, narrative, optionA, optionB, allTags },
        decisionId,
      )
      if (res?.insight) setInsight(res.insight)
    }
    fetch()
  }, [])

  return (
    <div className="relative h-dvh max-w-[393px] mx-auto flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.22)_0%,_transparent_70%)] -z-10" />

      {/* Header */}
      <div className="pt-14 px-6 pb-4 text-center space-y-1">
        <p className="text-purple-400 text-xs uppercase tracking-widest">Your Story</p>
        <h2 className="text-white text-lg font-light">"{decisionTitle}"</h2>
        <p className="text-white/40 text-xs">Summary Insight</p>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6 flex flex-col justify-center">
        <div className="bg-white/5 border border-white/10 rounded-3xl px-6 py-8 space-y-5">
          {loading && !insight ? (
            <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating your insight…
            </div>
          ) : (
            <p className="text-white/80 text-sm leading-relaxed text-center">
              {insight ?? '—'}
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
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
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
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
      <div className="px-5 pb-8 pt-2 flex gap-3">
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
  )
}
