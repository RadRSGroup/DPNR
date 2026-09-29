'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Dictatable from '@/components/ui/Dictatable'
import { staggerClass } from '@/lib/motion'

export type DepthMomentKind = 'after_felt' | 'after_impact'

/** The optional answers (mirror-steps/helpers.ts MirrorContent). */
export interface DepthAnswers {
  emotionUnderneath: string
  payoff: string
  deeperBelief: string
  origin: string
}

type PromptKey = 'underneath' | 'payoff' | 'belief'

// What "a little deeper" holds after each point (docs/MIRROR_DEPTH_REVIEW.md):
// the emotion underneath after Step 2; payoff and deeper belief after Step 4.
const PROMPTS: Record<DepthMomentKind, PromptKey[]> = {
  after_felt: ['underneath'],
  after_impact: ['payoff', 'belief'],
}
const FIELD: Record<PromptKey, keyof DepthAnswers> = { underneath: 'emotionUnderneath', payoff: 'payoff', belief: 'deeperBelief' }

const STEP: Record<DepthMomentKind, number> = { after_felt: 2, after_impact: 4 }

const TEXTAREA =
  'w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm resize-none focus:outline-none focus:border-purple-500/60 transition-colors'

interface Props {
  kind: DepthMomentKind
  sessionTitle: string
  initial: DepthAnswers
  /** Called with this moment's answers when going deeper, or null for a plain Continue (nothing changes). */
  onContinue: (answers: Partial<DepthAnswers> | null) => void
  onBack: () => void
}

/**
 * Mirror depth (founder feedback #30/#31): after Steps 2 and 4 the person
 * chooses to stay a little longer or to continue. Continue keeps today's
 * flow exactly. Going deeper shows the questions with optional answers
 * (slice 2): the page sends them with the next command, encrypted, used only
 * in the synthesis. Origin (after Step 4) is user-led: closed unless the
 * person opens it (founder #37: no invented roots).
 */
export default function DepthMoment({ kind, sessionTitle, initial, onContinue, onBack }: Props) {
  const t = useTranslations('MirrorDepth')
  const [deeper, setDeeper] = useState(false)
  const [answers, setAnswers] = useState<DepthAnswers>(initial)
  const [originOpen, setOriginOpen] = useState(!!initial.origin)

  function set(field: keyof DepthAnswers, value: string) {
    setAnswers(prev => ({ ...prev, [field]: value.slice(0, 5000) }))
  }

  function continueDeeper() {
    const fields = PROMPTS[kind].map(key => FIELD[key])
    if (kind === 'after_impact') fields.push('origin')
    // A closed Origin is sent as cleared: closing it means "leave this".
    onContinue(Object.fromEntries(fields.map(f => [f, f === 'origin' && !originOpen ? '' : answers[f].trim()])))
  }

  if (!deeper) {
    return (
      <MirrorStepShell step={STEP[kind]} sessionTitle={sessionTitle} onBack={onBack} screenLabel={t('choice.label')}>
        <div className="flex-1 flex flex-col justify-center gap-6 pt-2 text-center animate-settle-in">
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="font-display text-white text-xl lg:text-2xl leading-snug">{t('choice.title')}</h2>
            <p className="text-white/70 text-sm lg:text-base leading-relaxed">{t('choice.body')}</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
            <button
              onClick={() => setDeeper(true)}
              className="w-full py-3.5 rounded-full border border-[var(--color-violet-400)]/50 text-[var(--color-violet-200)] hover:bg-white/[0.06] text-sm transition-colors"
            >
              {t('choice.deeper')}
            </button>
            <PrimaryButton label={t('choice.continue')} onClick={() => onContinue(null)} />
          </div>
        </div>
      </MirrorStepShell>
    )
  }

  return (
    <MirrorStepShell step={STEP[kind]} sessionTitle={sessionTitle} onBack={() => setDeeper(false)} screenLabel={t('deeper.label')}>
      <div className="flex-1 flex flex-col gap-5 pt-2">
        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
          <p className="text-[var(--color-text-tertiary)] text-xs text-center leading-relaxed max-w-sm mx-auto">{t('deeper.hint')}</p>
          {PROMPTS[kind].map((key, i) => (
            <section
              key={key}
              className={`rounded-3xl border border-white/12 bg-white/[0.05] px-5 py-5 space-y-3 animate-settle-in ${staggerClass(i)}`}
            >
              <div className="space-y-2 text-center">
                <h2 className="font-display text-white text-lg lg:text-xl leading-snug">{t(`prompts.${key}.title`)}</h2>
                <p className="text-white/65 text-sm leading-relaxed">{t(`prompts.${key}.body`)}</p>
              </div>
              <Dictatable>
                <textarea
                  value={answers[FIELD[key]]}
                  onChange={e => set(FIELD[key], e.target.value)}
                  rows={2}
                  aria-label={t(`prompts.${key}.title`)}
                  placeholder={t('deeper.placeholder')}
                  className={TEXTAREA}
                />
              </Dictatable>
            </section>
          ))}
          {kind === 'after_impact' && (
            <section className={`rounded-3xl border border-white/10 bg-white/[0.03] px-5 py-5 space-y-3 animate-settle-in ${staggerClass(PROMPTS[kind].length)}`}>
              <div className="space-y-2 text-center">
                <h2 className="font-display text-white/90 text-base lg:text-lg leading-snug">{t('origin.title')}</h2>
                <p className="text-white/60 text-sm leading-relaxed">{t('origin.body')}</p>
              </div>
              {originOpen ? (
                <>
                  <Dictatable>
                    <textarea
                      value={answers.origin}
                      onChange={e => set('origin', e.target.value)}
                      rows={2}
                      aria-label={t('origin.title')}
                      placeholder={t('origin.placeholder')}
                      className={TEXTAREA}
                    />
                  </Dictatable>
                  <button onClick={() => setOriginOpen(false)} className="block mx-auto text-white/50 hover:text-white/80 text-xs underline underline-offset-4">
                    {t('origin.close')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setOriginOpen(true)}
                  className="block mx-auto px-4 py-2 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.06] text-xs transition-colors"
                >
                  {t('origin.open')}
                </button>
              )}
            </section>
          )}
        </div>
        <PrimaryButton label={t('deeper.continue')} onClick={continueDeeper} />
      </div>
    </MirrorStepShell>
  )
}
