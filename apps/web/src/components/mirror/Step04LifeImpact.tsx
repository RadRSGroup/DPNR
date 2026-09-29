'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Dictatable from '@/components/ui/Dictatable'

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
  const t = useTranslations('MirrorRoom')
  const [energyMoodEffect, setEnergyMoodEffect] = useState(initialEnergyMoodEffect)
  const [lifeDomain, setLifeDomain] = useState(initialLifeDomain)

  function handleContinue() {
    if (!energyMoodEffect.trim() || !lifeDomain.trim()) return
    return onComplete(energyMoodEffect.trim(), lifeDomain.trim())
  }

  return (
    <MirrorStepShell step={4} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step4.energyQuestion')}</p>
            <Dictatable>
              <textarea
                value={energyMoodEffect}
                onChange={e => setEnergyMoodEffect(e.target.value.slice(0, 5000))}
                placeholder={t('step4.energyPlaceholder')}
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step4.domainQuestion')}</p>
            <Dictatable>
              <textarea
                value={lifeDomain}
                onChange={e => setLifeDomain(e.target.value.slice(0, 5000))}
                placeholder={t('step4.domainPlaceholder')}
                rows={2}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label={t('continue')}
            onClick={handleContinue}
            disabled={!energyMoodEffect.trim() || !lifeDomain.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
