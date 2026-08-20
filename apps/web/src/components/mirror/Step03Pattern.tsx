'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  sessionTitle: string
  initialCopingResponse?: string
  initialRecurringPattern?: string
  onComplete: (copingResponse: string, recurringPattern: string) => void
  onBack?: () => void
}

/** PATTERN — SUBMIT_STEP only, {copingResponse, recurringPattern}, see mirror-steps/pattern.ts. */
export default function Step03Pattern({
  sessionTitle,
  initialCopingResponse = '',
  initialRecurringPattern = '',
  onComplete,
  onBack,
}: Props) {
  const [copingResponse, setCopingResponse] = useState(initialCopingResponse)
  const [recurringPattern, setRecurringPattern] = useState(initialRecurringPattern)

  function handleContinue() {
    if (!copingResponse.trim() || !recurringPattern.trim()) return
    onComplete(copingResponse.trim(), recurringPattern.trim())
  }

  return (
    <MirrorStepShell step={3} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">How did you cope with it afterward?</p>
            <textarea
              value={copingResponse}
              onChange={e => setCopingResponse(e.target.value.slice(0, 500))}
              placeholder="Did you shut down, vent to someone, distract yourself..."
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">Does this happen with certain people or situations?</p>
            <textarea
              value={recurringPattern}
              onChange={e => setRecurringPattern(e.target.value.slice(0, 500))}
              placeholder="Notice if this keeps showing up in a particular way..."
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!copingResponse.trim() || !recurringPattern.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
