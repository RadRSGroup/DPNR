'use client'
import { useState } from 'react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Lens, DecisionOption } from '@/lib/types'

interface Step04Props {
  decisionTitle: string
  optionA: DecisionOption
  optionB: DecisionOption
  onComplete: (lens: Lens) => void
  onBack?: () => void
  onSkip?: () => void
}

const LENSES: { id: Lens; icon: string; label: string; description: string }[] = [
  { id: 'pros_cons',      icon: '⚖️', label: 'Pros & Cons',      description: 'Weigh the practical upsides and downsides of each path.' },
  { id: 'fears_desires',  icon: '🔥', label: 'Fears & Desires',  description: 'Uncover what you truly want and what you\'re afraid of.' },
  { id: 'values_needs',   icon: '💎', label: 'Values & Needs',   description: 'See which values and needs each option honours.' },
]

export default function Step04({ decisionTitle, optionA, optionB, onComplete, onBack, onSkip }: Step04Props) {
  const [selected, setSelected] = useState<Lens | null>(null)

  return (
    <StepShell step={4} decisionTitle={decisionTitle} onBack={onBack} onSkip={onSkip}>
      <div className="flex-1 flex flex-col space-y-5 pt-2">

        {/* Options reminder — small cards */}
        <div className="grid grid-cols-2 gap-2">
          {[optionA, optionB].map(opt => (
            <div key={opt.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-purple-400 text-xs mb-1">Option {opt.label}</p>
              <p className="text-white/60 text-xs leading-relaxed line-clamp-3">{opt.content}</p>
            </div>
          ))}
        </div>

        <p className="text-white/60 text-sm text-center leading-relaxed">
          Choose one perspective to explore this decision further, or skip.
        </p>

        {/* Lens cards */}
        <div className="space-y-3">
          {LENSES.map(lens => (
            <button
              key={lens.id}
              onClick={() => setSelected(lens.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                selected === lens.id
                  ? 'bg-purple-900/30 border-purple-600/60'
                  : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lens.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{lens.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{lens.description}</p>
                </div>
                {selected === lens.id && (
                  <span className="ml-auto text-purple-400 text-lg">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <PrimaryButton
          label="Continue process"
          onClick={() => selected && onComplete(selected)}
          disabled={!selected}
        />
      </div>
    </StepShell>
  )
}
