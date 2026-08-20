'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'

interface Props {
  sessionTitle: string
  initialEnergyMoodEffect?: string
  initialLifeDomain?: string
  onComplete: (energyMoodEffect: string, lifeDomain: string) => void
  onBack?: () => void
}

/** LIFE_IMPACT — SUBMIT_STEP only, {energyMoodEffect, lifeDomain}, see mirror-steps/life-impact.ts. */
export default function Step04LifeImpact({
  sessionTitle,
  initialEnergyMoodEffect = '',
  initialLifeDomain = '',
  onComplete,
  onBack,
}: Props) {
  const [energyMoodEffect, setEnergyMoodEffect] = useState(initialEnergyMoodEffect)
  const [lifeDomain, setLifeDomain] = useState(initialLifeDomain)

  function handleContinue() {
    if (!energyMoodEffect.trim() || !lifeDomain.trim()) return
    onComplete(energyMoodEffect.trim(), lifeDomain.trim())
  }

  return (
    <MirrorStepShell step={4} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">How did this affect your energy or mood?</p>
            <textarea
              value={energyMoodEffect}
              onChange={e => setEnergyMoodEffect(e.target.value.slice(0, 500))}
              placeholder="Drained, on edge, foggy for the rest of the day..."
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">Which part of your life does this touch most?</p>
            <textarea
              value={lifeDomain}
              onChange={e => setLifeDomain(e.target.value.slice(0, 300))}
              placeholder="Work, a relationship, how you see yourself..."
              rows={2}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!energyMoodEffect.trim() || !lifeDomain.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
