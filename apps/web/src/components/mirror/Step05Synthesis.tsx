'use client'
import { useEffect, useRef, useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAI, RefineFn } from '@/lib/useAI'

interface Props {
  sessionTitle: string
  initialSynthesis?: string
  onRefine: RefineFn
  onComplete: (synthesis: string) => void
  onBack?: () => void
}

/**
 * SYNTHESIS — REFINE fires automatically on mount, {} -> {synthesis}
 * (ephemeral, nothing persisted). SUBMIT_STEP takes no input and advances
 * to COMMITMENT. See mirror-steps/synthesis.ts.
 */
export default function Step05Synthesis({ sessionTitle, initialSynthesis, onRefine, onComplete, onBack }: Props) {
  const [synthesis, setSynthesis] = useState<string | undefined>(initialSynthesis)
  const { callAI, loading, error } = useAI(onRefine)
  const fetched = useRef(!!initialSynthesis)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    callAI<{ synthesis: string }>('synthesis', {}).then(res => {
      if (res?.synthesis) setSynthesis(res.synthesis)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MirrorStepShell step={5} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <p className="text-white/70 text-sm text-center leading-relaxed">
            Here&apos;s what came up, reflected back to you.
          </p>

          {loading && !synthesis && (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-purple-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            </div>
          )}

          {synthesis && (
            <div className="bg-purple-900/20 border border-purple-700/30 rounded-2xl px-5 py-5 space-y-1 fade-up">
              <p className="text-purple-300 text-xs uppercase tracking-wide">Synthesis</p>
              <p className="text-white/85 text-sm italic leading-relaxed">&quot;{synthesis}&quot;</p>
            </div>
          )}

          {error && !synthesis && (
            <p className="text-red-400/80 text-sm text-center">Something went wrong generating this reflection — you can still continue.</p>
          )}
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={() => onComplete(synthesis ?? '')}
            disabled={loading && !synthesis}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
