'use client'
import { useEffect, useState } from 'react'
import StepShell from './StepShell'
import { useAI, RefineFn } from '@/lib/useAI'

interface ClarityToActionScreenProps {
  decisionTitle: string
  onRefine: RefineFn
  onCommit: (nextStep: string, bodyFeelings: string[]) => void
  onSkip: () => void
  onBack: () => void
}

const BODY_FEELINGS = [
  'Lightness', 'Excitement', 'Tension in the body', 'Calm confidence',
  'Nervous but curious', 'Relief', 'Resistance', 'Openness', 'Doubt', 'Readiness',
]

export default function ClarityToActionScreen({
  decisionTitle, onRefine,
  onCommit, onSkip, onBack,
}: ClarityToActionScreenProps) {
  const [suggestedStep, setSuggestedStep] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([])
  const { callAI, loading } = useAI(onRefine)

  useEffect(() => {
    let ignore = false
    async function fetchSuggestion() {
      // CLARITY_ACTION's REFINE re-derives everything server-side — no client input needed.
      const res = await callAI<{ nextStep: string }>('clarity_action', {})
      if (!ignore && res?.nextStep) {
        setSuggestedStep(res.nextStep)
        setNextStep(res.nextStep)
      }
    }
    fetchSuggestion()
    return () => { ignore = true }
    // Runs once on mount by design — this screen is mounted fresh per step, and callAI isn't
    // memoized, so including the full dep list would re-fire the AI call on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleFeeling(f: string) {
    setSelectedFeelings(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  return (
    <StepShell step={10} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      <div className="flex-1 flex flex-col space-y-5 pt-2 pb-2">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-white/60 text-sm">Based on what became clear for you.</p>
        </div>

        {/* Next step section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 space-y-3">
          <div className="space-y-1">
            <p className="text-white text-sm font-medium">Your Next Small Step</p>
            <p className="text-white/40 text-xs">What is one small step that moves you slightly toward this direction?</p>
            <p className="text-white/30 text-xs">It should feel: <span className="text-white/50">Small • Safe • Possible within the next few days</span></p>
          </div>

          <div className="space-y-1">
            <p className="text-white/50 text-xs">My next step:</p>
            {loading && !suggestedStep ? (
              <div className="flex items-center gap-2 text-white/30 text-xs py-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Suggesting a step…
              </div>
            ) : (
              <textarea
                value={nextStep}
                onChange={e => setNextStep(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 text-white/80 text-sm resize-none focus:outline-none focus:border-purple-500/50 transition-colors placeholder-white/25"
                placeholder="Describe your next small step…"
              />
            )}
          </div>
        </div>

        {/* Body feelings */}
        <div className="space-y-2">
          <p className="text-white/50 text-xs text-center">When you imagine this — what happens in you?</p>
          <div className="flex flex-wrap gap-2">
            {BODY_FEELINGS.map(f => (
              <button
                key={f}
                onClick={() => toggleFeeling(f)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                  selectedFeelings.includes(f)
                    ? 'border-purple-500/70 bg-purple-900/30 text-white'
                    : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="px-5 py-3.5 rounded-full border border-white/20 text-white/60 hover:text-white text-sm transition-all"
          >
            Back
          </button>
          <button
            onClick={onSkip}
            className="px-5 py-3.5 rounded-full border border-white/15 text-white/40 hover:text-white/60 text-sm transition-all"
          >
            Skip
          </button>
          <button
            onClick={() => onCommit(nextStep.trim(), selectedFeelings)}
            disabled={!nextStep.trim()}
            className="flex-1 py-3.5 rounded-full bg-white/90 hover:bg-white active:scale-[0.98] text-[#1a0826] text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Commit to This Step
          </button>
        </div>
      </div>
    </StepShell>
  )
}
