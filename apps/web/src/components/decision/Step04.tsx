'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import StepShell from './StepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { OptionContext } from './RoomHeadings'
import { Lens, DecisionOption } from '@/lib/types'

interface Step04Props {
  decisionTitle: string
  /** A, B and (2026-09-28 #2) an optional C. */
  options: DecisionOption[]
  initialLens?: Lens
  /** Lenses already explored in this decision: shown softened, still reopenable (#6/#7). */
  completedLenses?: Lens[]
  onComplete: (lens: Lens) => void
  /** Move on to Future Projection (allowed at any point; a gentle reminder first if a lens is untouched). */
  onContinue: () => void
  onBack?: () => void
}

/**
 * Photos for the three lens cards: the founder's text-free versions (Drive
 * "Decision Making Room": "Pros & Cons", "Fear & Desire", "Values & Needs",
 * 2026-09-28), 720px wide. The title and line are live, translated text on top.
 */
const LENSES: { id: Lens; key: 'prosCons' | 'fearsDesires' | 'valuesNeeds'; image: string }[] = [
  { id: 'pros_cons', key: 'prosCons', image: '/images/decision/lens-pros-cons.webp' },
  { id: 'fears_desires', key: 'fearsDesires', image: '/images/decision/lens-fears-desires.webp' },
  { id: 'values_needs', key: 'valuesNeeds', image: '/images/decision/lens-values-needs.webp' },
]

/**
 * Choose Your Lens (founder feedback 2026-09-28 #5–#7, Figma "Deep
 * Exploration" frames): the options stay in view, then three distinct
 * photo cards. A lens that's already been explored is softened with a
 * check, and remains tappable so the person can go back to it.
 */
export default function Step04({ decisionTitle, options, initialLens, completedLenses = [], onComplete, onContinue, onBack }: Step04Props) {
  const t = useTranslations('DecisionLenses')
  const [selected, setSelected] = useState<Lens | null>(initialLens && !completedLenses.includes(initialLens) ? initialLens : null)
  const selectedMeta = LENSES.find((l) => l.id === selected)
  const doneCount = completedLenses.length
  const remaining = LENSES.filter((l) => !completedLenses.includes(l.id))
  // Before integration, an untouched lens is named once, gently; the person can still go on (#6/#7).
  const [reminding, setReminding] = useState(false)
  function handleContinue() {
    if (remaining.length > 0 && !reminding) setReminding(true)
    else return onContinue()
  }

  return (
    <StepShell step={4} decisionTitle={decisionTitle} onBack={onBack} onSkip={handleContinue}>
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 pt-2">
        <OptionContext options={options} />

        <p className="text-white/75 text-sm lg:text-base text-center leading-relaxed max-w-md mx-auto">
          {doneCount === 0 ? t('intro') : t('introMore', { count: doneCount })}
        </p>

        <div role="radiogroup" aria-label={t('groupLabel')} className="grid grid-cols-3 gap-2 lg:gap-4">
          {LENSES.map((lens) => {
            const done = completedLenses.includes(lens.id)
            const isSelected = selected === lens.id
            return (
              <button
                key={lens.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(lens.id)}
                className={`group relative aspect-[3/5] lg:aspect-[4/5] rounded-2xl lg:rounded-3xl overflow-hidden border text-start transition-all duration-(--motion-calm) ${
                  isSelected
                    ? 'border-[var(--color-amber-300)]/80 shadow-[0_0_0_1px_rgba(251,203,107,0.5),0_0_26px_rgba(245,185,66,0.35)]'
                    : 'border-white/20 hover:border-white/40'
                } ${done && !isSelected ? 'opacity-45 saturate-50' : ''}`}
              >
                <Image src={lens.image} alt="" fill sizes="(min-width: 1024px) 22vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                {done && (
                  <span className="absolute top-2 end-2 w-6 h-6 rounded-full bg-black/50 border border-white/40 flex items-center justify-center" aria-label={t('done')}>
                    <Check className="w-3.5 h-3.5 text-white" />
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2.5 lg:p-5">
                  <p className="font-display text-white text-base lg:text-2xl leading-tight">{t(`${lens.key}.title`)}</p>
                  <p className="hidden lg:block text-white/80 text-sm leading-snug mt-2">{t(`${lens.key}.body`)}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Phones have no room for the line on each card: the chosen one's shows here. */}
        <p aria-live="polite" className="lg:hidden min-h-[2.75rem] text-center text-sm leading-snug text-[var(--color-amber-300)]">
          {selectedMeta ? t(`${selectedMeta.key}.body`) : ''}
        </p>

        {reminding ? (
          <div role="status" className="rounded-2xl border border-[var(--color-amber-300)]/35 bg-white/[0.05] px-4 py-4 space-y-3 animate-settle-in">
            <p className="text-white/85 text-sm leading-relaxed text-center">
              {t('reminder', { lenses: remaining.map((l) => t(`${l.key}.title`)).join(t('listJoin')), count: remaining.length })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setReminding(false)}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-white/80 hover:border-white/40 text-sm transition-colors"
              >
                {t('stay')}
              </button>
              <button
                onClick={onContinue}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white text-sm font-medium transition-colors"
              >
                {t('continueAnyway')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <PrimaryButton
              label={selected && completedLenses.includes(selected) ? t('revisit') : t('explore')}
              onClick={() => selected && onComplete(selected)}
              disabled={!selected}
            />
            {doneCount > 0 && (
              <button
                onClick={handleContinue}
                className="w-full py-3 rounded-2xl border border-white/20 text-white/85 hover:border-white/40 text-sm transition-colors"
              >
                {t('continue')}
              </button>
            )}
          </div>
        )}
      </div>
    </StepShell>
  )
}
