'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useAI, RefineFn } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import type { DecisionOption, OptionLabel } from '@/lib/types'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'
import ScrollCue from '@/components/shared/ScrollCue'
import Card from '@/components/ui/Card'
import AiThinking from '@/components/shared/AiThinking'
import { OptionContext } from './RoomHeadings'
import { useDecisionLabels } from '@/lib/decision-labels'

export type SummaryType = 'pros_cons' | 'fears_desires' | 'values_needs' | 'values' | 'needs' | 'projections'

interface Props {
  decisionTitle: string
  stepType: SummaryType
  /** Per option, the selections by kind (pro/con, desire/fear, values/needs, projections). */
  tags: Partial<Record<OptionLabel, Record<string, string[]>>>
  onRefine: RefineFn
  onContinue: () => void
  onBack?: () => void
  /** A, B and an optional C (2026-09-28 #2); shown above the comparison so nobody has to remember the letters (#8). */
  options: DecisionOption[]
}

// The phase each summary belongs to, in StepShell's six (Align = the lenses, Decide = Future Projection).
const PHASE: Record<SummaryType, number> = {
  pros_cons: 4,
  fears_desires: 4,
  values_needs: 4,
  values: 4,
  needs: 4,
  projections: 5,
}

// Message keys (DecisionRoom namespace unless noted) for each summary's name, intro quote and CTA.
const STEP_TYPE_LABEL: Record<SummaryType, { ns: 'DecisionLenses' | 'DecisionRoom'; key: string }> = {
  pros_cons: { ns: 'DecisionLenses', key: 'prosCons.title' },
  fears_desires: { ns: 'DecisionLenses', key: 'fearsDesires.title' },
  values_needs: { ns: 'DecisionLenses', key: 'valuesNeeds.title' },
  values: { ns: 'DecisionRoom', key: 'sections.value' },
  needs: { ns: 'DecisionRoom', key: 'sections.need' },
  projections: { ns: 'DecisionRoom', key: 'stepLabels.7' },
}

const INTRO_QUOTE: Record<SummaryType, string | null> = {
  pros_cons: null,
  fears_desires: 'sectionSummary.quotes.fearsDesires',
  values_needs: 'sectionSummary.quotes.valuesNeeds',
  values: 'sectionSummary.quotes.values',
  needs: 'sectionSummary.quotes.needs',
  projections: 'sectionSummary.quotes.projections',
}

const CTA_LABEL: Record<SummaryType, string> = {
  pros_cons: 'keepExploring',
  fears_desires: 'sectionSummary.goDeeper',
  values_needs: 'sectionSummary.goDeeper',
  values: 'sectionSummary.exploreNeeds',
  needs: 'sectionSummary.goDeeper',
  projections: 'sectionSummary.complete',
}

// Keys under DecisionRoom.agreement.
const AGREEMENT_OPTIONS = ['accurate', 'refine', 'notSure', 'partlyTrue']

/**
 * The summary after a lens or Future Projection. Founder feedback
 * 2026-09-28: a comfortable reading column on wide screens (#9/#13), the
 * options named above the comparison (#8), one heading language in warm
 * gold instead of a colour per section (#14), no decorative dashes (#15),
 * and a visible cue when more sits below the fold (#16).
 */
export default function SectionSummaryScreen({
  decisionTitle, stepType, tags, onRefine, onContinue, onBack, options,
}: Props) {
  const labels = options.map((o) => o.label)
  const row = (key: string) => Object.fromEntries(labels.map((l) => [l, tags[l]?.[key] ?? []])) as Partial<Record<OptionLabel, string[]>>
  const router = useRouter()
  const t = useTranslations('DecisionRoom')
  const tLens = useTranslations('DecisionLenses')
  const [agreement, setAgreement] = useState<string | null>(null)
  const [wordFromUs, setWordFromUs] = useState('')
  const [reflection, setReflection] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI(onRefine)

  useEffect(() => {
    async function fetch() {
      // The backend re-derives step/decisionTitle/options/selections from
      // the session itself (gatherDecisionContext) — REFINE here takes no
      // meaningful input, matching every other post-Step05/06/07 interstitial.
      const res = await callAI<{ wordFromUs: string; reflection: string }>('section_summary', {})
      if (res) {
        setWordFromUs(res.wordFromUs ?? '')
        setReflection(res.reflection ?? '')
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quoteKey = INTRO_QUOTE[stepType]
  const quote = quoteKey ? t(quoteKey) : null
  const typeLabel = STEP_TYPE_LABEL[stepType].ns === 'DecisionLenses' ? tLens(STEP_TYPE_LABEL[stepType].key) : t(STEP_TYPE_LABEL[stepType].key)

  return (
    <RoomScreenFrame wide backgroundSrc="/images/decision/decision-room-hero.webp" dimBackground glows={['bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,_rgba(139,92,246,0.18)_0%,_transparent_70%)]']}>

      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 lg:px-10 pt-14 lg:pt-8 pb-2">
        <button
          onClick={() => router.push('/dashboard')}
          aria-label={t('close')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >✕</button>
        <span className="text-[var(--color-text-tertiary)] text-xs">{t('roomLabel')}</span>
        <div className="w-8 h-8" />
      </div>

      {/* Header: the decision, then where you are (#11/#14) */}
      <div className="text-center px-6 pt-3 pb-4">
        <h2 className="text-white text-lg lg:text-2xl font-light lg:font-display">&quot;{decisionTitle}&quot;</h2>
        <p className="text-[var(--color-amber-300)] text-xs uppercase tracking-[0.18em] mt-2">
          {t('sectionSummary.header', { step: PHASE[stepType], total: 6, label: typeLabel })}
        </p>
      </div>

      <ScrollCue className="px-5 lg:px-10 pb-6">
        <div className="max-w-3xl mx-auto w-full space-y-6 lg:space-y-8 animate-settle-in">
          {quote && (
            <p className="font-display text-white/80 text-base lg:text-lg leading-relaxed italic text-center whitespace-pre-line">{quote}</p>
          )}

          {options.length >= 2 && <OptionContext options={options} />}

          {stepType === 'pros_cons' && (
            <div className="space-y-6">
              <SectionRow label={t('sections.pro')} tagType="pro" labels={labels} tags={row('pro')} />
              <SectionRow label={t('sections.con')} tagType="con" labels={labels} tags={row('con')} />
            </div>
          )}

          {stepType === 'fears_desires' && (
            <div className="space-y-6">
              <SectionRow label={t('sections.desire')} tagType="desire" labels={labels} tags={row('desire')} />
              <SectionRow label={t('sections.fear')} tagType="fear" labels={labels} tags={row('fear')} />
            </div>
          )}

          {(stepType === 'values_needs' || stepType === 'values' || stepType === 'needs') && (
            <div className="space-y-6">
              {stepType !== 'needs' && <SectionRow label={t('sections.value')} tagType="value" labels={labels} tags={row('values')} />}
              {stepType !== 'values' && <SectionRow label={t('sections.need')} tagType="need" labels={labels} tags={row('needs')} />}
            </div>
          )}

          {stepType === 'projections' && (
            <section className="space-y-3">
              <SectionLabel>{t('sectionSummary.futuresResonated')}</SectionLabel>
              <div className={`grid grid-cols-1 gap-3 lg:gap-6 ${labels.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                {labels.map(label => {
                  const projs = tags[label]?.projections ?? []
                  return (
                    <Card key={label} className="!p-4 lg:!p-5 space-y-2">
                      <p className="text-[var(--color-amber-300)] text-[11px] uppercase tracking-[0.18em]">{t('optionLabel', { label })}</p>
                      {projs.length > 0 ? (
                        <ul className="space-y-2">
                          {projs.map(p => (
                            <li key={p} className="text-sm lg:text-base text-white/85 leading-relaxed">{p}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-white/40 text-sm italic">{t('noneSelected')}</p>
                      )}
                    </Card>
                  )
                })}
              </div>
            </section>
          )}

          {loading && !wordFromUs && <AiThinking label={t('sectionSummary.reflecting')} className="py-3" />}

          {wordFromUs && (
            <section className="rounded-3xl border border-white/12 bg-white/[0.05] px-5 py-5 lg:px-8 lg:py-7 space-y-5 animate-settle-in">
              <div className="space-y-2">
                <SectionLabel>{t('aWordFromUs')}</SectionLabel>
                <p className="text-white/90 text-base lg:text-lg leading-relaxed">{wordFromUs}</p>
              </div>
              {reflection && (
                <div className="space-y-2 pt-1">
                  <SectionLabel>{t('sectionSummary.reflection')}</SectionLabel>
                  <p className="text-white/80 text-base leading-relaxed">{reflection}</p>
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <p className="text-white/70 text-sm text-center">{t('doesThisFeelAccurate')}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {AGREEMENT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setAgreement(prev => prev === opt ? null : opt)}
                  aria-pressed={agreement === opt}
                  className={`rounded-full border px-3 py-2.5 text-sm transition-all ${
                    agreement === opt
                      ? 'border-[var(--color-amber-300)]/60 bg-white/[0.08] text-white'
                      : 'border-white/15 bg-white/5 text-white/65 hover:border-white/30 hover:text-white/85'
                  }`}
                >
                  {t(`agreement.${opt}`)}
                </button>
              ))}
            </div>
          </section>
        </div>
      </ScrollCue>

      {/* Bottom nav */}
      <div className="flex items-center gap-3 px-5 lg:px-10 pb-8 pt-3 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          aria-label={t('back')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onContinue}
          className="flex-1 h-12 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white text-sm font-medium transition-colors shadow-[var(--shadow-glow-violet)]"
        >
          {t(CTA_LABEL[stepType])}
        </button>
      </div>
    </RoomScreenFrame>
  )
}

/** The room's section label: small warm-gold caps, the same everywhere (#14). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[var(--color-amber-300)] text-xs uppercase tracking-[0.2em]">{children}</h3>
}

function SectionRow({ label, tagType, labels, tags: byOption }: { label: string; tagType: string; labels: OptionLabel[]; tags: Partial<Record<OptionLabel, string[]>> }) {
  const t = useTranslations('DecisionRoom')
  const { tag: tagLabel } = useDecisionLabels()
  // Three options stack on phones and sit side by side from sm up.
  return (
    <section className="space-y-3">
      <SectionLabel>{label}</SectionLabel>
      <div className={`grid gap-3 lg:gap-6 ${labels.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
        {labels.map((opt) => {
          const tags = byOption[opt] ?? []
          return (
            <div key={opt} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:p-4 space-y-2">
              <p className="text-white/55 text-[11px] uppercase tracking-[0.18em]">{t('optionLabel', { label: opt })}</p>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="text-xs lg:text-sm bg-white/[0.07] border border-white/15 text-white/85 rounded-full px-2.5 py-1">{tagLabel(tagType, tag)}</span>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm italic">{t('noneSelected')}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
