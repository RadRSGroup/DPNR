'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import { EmotionColor } from '@/lib/types'
import { useAI } from '@/lib/useAI'

interface SessionSummaryScreenProps {
  decisionTitle: string
  narrative: string
  optionA: string
  optionB: string
  emotionColor?: EmotionColor
  emotionBodyLocation?: string
  emotionReflection?: string
  tagsA?: Record<string, string[]>
  tagsB?: Record<string, string[]>
  valuesA?: string[]
  needsA?: string[]
  valuesB?: string[]
  needsB?: string[]
  projectionsA?: string[]
  projectionsB?: string[]
  chosenLean?: string
  decisionId?: string
  onContinue: () => void
  onBack: () => void
}

type Agreement = 'accurate' | 'refine' | 'not_sure' | 'partly_true'

const SECTIONS = [
  { key: 'bodyAwareness',  label: 'Body Awareness' },
  { key: 'prosAndCons',    label: 'Pros & Cons' },
  { key: 'desireVsFear',   label: 'Desire VS Fear' },
  { key: 'valuesAndNeeds', label: 'Values & Needs' },
  { key: 'futureSelf',     label: 'Future Self' },
] as const

const AGREEMENT_OPTIONS: { key: Agreement; label: string }[] = [
  { key: 'accurate',    label: 'Accurate' },
  { key: 'refine',      label: 'Refine this' },
  { key: 'not_sure',    label: 'Not sure' },
  { key: 'partly_true', label: 'Partly True' },
]

export default function SessionSummaryScreen({
  decisionTitle, narrative, optionA, optionB,
  emotionColor, emotionBodyLocation, emotionReflection,
  tagsA, tagsB, valuesA, needsA, valuesB, needsB,
  projectionsA, projectionsB, chosenLean, decisionId,
  onContinue, onBack,
}: SessionSummaryScreenProps) {
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [situation, setSituation] = useState('')
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const { callAI, loading } = useAI()

  useEffect(() => {
    async function fetch() {
      const res = await callAI<{
        situation: string
        bodyAwareness: string
        prosAndCons: string
        desireVsFear: string
        valuesAndNeeds: string
        futureSelf: string
      }>(
        'session_summary',
        {
          decisionTitle, narrative, optionA, optionB,
          emotionColor, emotionBodyLocation, emotionReflection,
          tagsA, tagsB, valuesA, needsA, valuesB, needsB,
          projectionsA, projectionsB, chosenLean,
        },
        decisionId,
      )
      if (res) {
        const { situation: sit, ...rest } = res
        setSituation(sit ?? '')
        setSummaries(rest)
      }
    }
    fetch()
  }, [])

  return (
    <StepShell step={8} decisionTitle={decisionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col space-y-4 pt-2 pb-2">

        {/* Situation */}
        {loading && !situation ? (
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-6">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Generating your summary…
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-purple-400 text-xs uppercase tracking-widest">The situation:</p>
              <p className="text-white/70 text-sm leading-relaxed">{situation}</p>
            </div>

            {/* Per-section summaries */}
            <div className="space-y-3">
              {SECTIONS.map(({ key, label }) => (
                summaries[key] ? (
                  <div key={key} className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3 space-y-1">
                    <p className="text-white text-xs font-medium">{label}</p>
                    <p className="text-white/55 text-xs leading-relaxed">{summaries[key]}</p>
                  </div>
                ) : null
              ))}
            </div>
          </>
        )}

        {/* Do You Agree */}
        <div className="pt-2">
          <div className="flex items-center gap-3 pb-3">
            <div className="flex-1 h-px bg-white/10" />
            <p className="text-white/30 text-xs">Do You Agree?</p>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {AGREEMENT_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAgreement(key)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-sm transition-all ${
                  agreement === key
                    ? 'border-purple-500/70 bg-purple-900/30 text-white'
                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
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

        {/* CTA */}
        <button
          onClick={onContinue}
          disabled={!agreement || loading}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none hover:from-purple-500 hover:to-fuchsia-500 active:scale-[0.98]"
        >
          Supporting Yourself →
        </button>
      </div>
    </StepShell>
  )
}
