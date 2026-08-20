'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  initialSituation?: string
  initialTrigger?: string
  onComplete: (situation: string, trigger: string) => void
  onBack?: () => void
}

/** SITUATION — SUBMIT_STEP only, {situation, trigger}, see mirror-steps/situation.ts. */
export default function Step01Situation({ initialSituation = '', initialTrigger = '', onComplete, onBack }: Props) {
  const [situation, setSituation] = useState(initialSituation)
  const [trigger, setTrigger] = useState(initialTrigger)

  function handleContinue() {
    if (!situation.trim() || !trigger.trim()) return
    onComplete(situation.trim(), trigger.trim())
  }

  return (
    <MirrorStepShell step={1} sessionTitle={situation.trim().slice(0, 40) || 'Mirror Room'} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What happened?</p>
            <textarea
              value={situation}
              onChange={e => setSituation(e.target.value.slice(0, 800))}
              placeholder="Describe the moment, as plainly as you can..."
              rows={4}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <p className="text-white/30 text-xs text-right">{situation.length}/800</p>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What triggered this for you?</p>
            <textarea
              value={trigger}
              onChange={e => setTrigger(e.target.value.slice(0, 500))}
              placeholder="What was it, specifically, that set this off?"
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <p className="text-white/30 text-xs text-right">{trigger.length}/500</p>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!situation.trim() || !trigger.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
