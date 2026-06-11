'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAI } from '@/lib/useAI'
import { TokenCapModal } from '@/components/ui/TokenCapModal'
import { DecisionOption, TOTAL_STEPS } from '@/lib/types'

export type SummaryType = 'pros_cons' | 'fears_desires' | 'values_needs' | 'values' | 'needs'

interface Props {
  decisionTitle: string
  stepType: SummaryType
  optionA: DecisionOption
  optionB: DecisionOption
  tagsA: Record<string, string[]>
  tagsB: Record<string, string[]>
  decisionId?: string
  onContinue: () => void
  onBack?: () => void
}

const STEP_NUM: Record<SummaryType, number> = {
  pros_cons: 5,
  fears_desires: 5,
  values_needs: 6,
  values: 6,
  needs: 6,
}

const STEP_TYPE_LABEL: Record<SummaryType, string> = {
  pros_cons: 'Pros & Cons',
  fears_desires: 'Fear & Desires',
  values_needs: 'Values & Needs',
  values: 'Values',
  needs: 'Needs',
}

const INTRO_QUOTE: Record<SummaryType, string | null> = {
  pros_cons: null,
  fears_desires: 'Desire points toward growth and new possibility.\nFear protects safety and what already works.',
  values_needs: 'Your values and needs reveal what matters most\nbeneath this decision.',
  values: 'Your values are the principles you live by —\nthe compass beneath every real choice.',
  needs: 'Your six core needs shape every decision you make,\noften without you knowing it.',
}

const CTA_LABEL: Record<SummaryType, string> = {
  pros_cons: 'Keep Exploring →',
  fears_desires: "Let's Go Deeper →",
  values_needs: "Let's Go Deeper →",
  values: 'Explore Your Needs →',
  needs: "Let's Go Deeper →",
}

const AGREEMENT_OPTIONS = ['Accurate', 'Refine this', 'Not sure', 'Partly True']

export default function SectionSummaryScreen({
  decisionTitle, stepType, optionA, optionB, tagsA, tagsB, decisionId, onContinue, onBack,
}: Props) {
  const router = useRouter()
  const [agreement, setAgreement] = useState<string | null>(null)
  const [wordFromUs, setWordFromUs] = useState('')
  const [reflection, setReflection] = useState('')
  const { callAI, loading, tokenCapReached, dismissTokenCap } = useAI()

  const step = STEP_NUM[stepType]

  useEffect(() => {
    async function fetch() {
      const selectionsA = Object.values(tagsA).flat()
      const selectionsB = Object.values(tagsB).flat()
      const res = await callAI<{ wordFromUs: string; reflection: string }>(
        'section_summary',
        { step: stepType, decisionTitle, optionA: optionA.content, optionB: optionB.content, selectionsA, selectionsB },
        decisionId,
      )
      if (res) {
        setWordFromUs(res.wordFromUs ?? '')
        setReflection(res.reflection ?? '')
      }
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quote = INTRO_QUOTE[stepType]

  return (
    <div className="relative h-dvh flex flex-col overflow-hidden max-w-[393px] mx-auto">
      {/* Warm mauve background — visually distinct from the dark galaxy of regular steps */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3d0d52] via-[#2a0940] to-[#1c052e] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,_rgba(210,80,230,0.22)_0%,_transparent_70%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,_rgba(160,40,200,0.12)_0%,_transparent_60%)] -z-10" />

      {tokenCapReached && <TokenCapModal onClose={dismissTokenCap} />}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >✕</button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-400/40 flex items-center justify-center text-xs">✦</div>
          <span className="text-white/40 text-xs">Manifest yo...</span>
        </div>
        <div className="w-8 h-8" />
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 px-5 pt-2 pb-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i + 1 < step
                ? 'bg-purple-400 w-5'
                : i + 1 === step
                ? 'bg-fuchsia-300 w-8 shadow-[0_0_8px_rgba(240,100,255,0.7)]'
                : 'bg-white/15 w-4'
            }`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="text-center px-6 pt-4 pb-3">
        <h2 className="text-white text-lg font-light">"{decisionTitle}"</h2>
        <p className="text-fuchsia-300/60 text-xs mt-1 uppercase tracking-widest">
          Step {String(step).padStart(2, '0')}: {STEP_TYPE_LABEL[stepType]}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pb-4 fade-up">

        {/* Intro quote for fears/desires and values/needs */}
        {quote && (
          <div className="bg-fuchsia-900/20 border border-fuchsia-600/25 rounded-2xl px-4 py-3">
            <p className="text-fuchsia-200/70 text-sm leading-relaxed italic text-center whitespace-pre-line">{quote}</p>
          </div>
        )}

        {/* Pros & Cons: two-column tag comparison */}
        {stepType === 'pros_cons' && (
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => {
              const pros = (label === 'A' ? tagsA : tagsB).pro ?? []
              const cons = (label === 'A' ? tagsA : tagsB).con ?? []
              return (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                  <p className="text-purple-300 text-xs font-semibold mb-1">Option {label}</p>
                  {pros.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-green-400/60 text-[10px] uppercase tracking-wider">Pros</p>
                      <div className="flex flex-wrap gap-1">
                        {pros.map(t => (
                          <span key={t} className="text-[10px] bg-green-900/25 border border-green-600/30 text-green-300/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cons.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-red-400/60 text-[10px] uppercase tracking-wider">Cons</p>
                      <div className="flex flex-wrap gap-1">
                        {cons.map(t => (
                          <span key={t} className="text-[10px] bg-red-900/25 border border-red-600/30 text-red-300/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Fears & Desires: show desire/fear comparison */}
        {stepType === 'fears_desires' && (
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => {
              const desires = (label === 'A' ? tagsA : tagsB).desire ?? []
              const fears = (label === 'A' ? tagsA : tagsB).fear ?? []
              return (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                  <p className="text-purple-300 text-xs font-semibold mb-1">Option {label}</p>
                  {desires.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-amber-400/60 text-[10px] uppercase tracking-wider">Desires</p>
                      <div className="flex flex-wrap gap-1">
                        {desires.map(t => (
                          <span key={t} className="text-[10px] bg-amber-900/25 border border-amber-600/30 text-amber-200/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {fears.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-indigo-400/60 text-[10px] uppercase tracking-wider">Fears</p>
                      <div className="flex flex-wrap gap-1">
                        {fears.map(t => (
                          <span key={t} className="text-[10px] bg-indigo-900/25 border border-indigo-600/30 text-indigo-200/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Values & Needs: legacy combined view */}
        {stepType === 'values_needs' && (
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => {
              const values = (label === 'A' ? tagsA : tagsB).values ?? []
              const needs = (label === 'A' ? tagsA : tagsB).needs ?? []
              return (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                  <p className="text-purple-300 text-xs font-semibold mb-1">Option {label}</p>
                  {values.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-violet-400/60 text-[10px] uppercase tracking-wider">Values</p>
                      <div className="flex flex-wrap gap-1">
                        {values.map(t => (
                          <span key={t} className="text-[10px] bg-violet-900/25 border border-violet-600/30 text-violet-200/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {needs.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-rose-400/60 text-[10px] uppercase tracking-wider">Needs</p>
                      <div className="flex flex-wrap gap-1">
                        {needs.map(t => (
                          <span key={t} className="text-[10px] bg-rose-900/25 border border-rose-600/30 text-rose-200/80 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Values only */}
        {stepType === 'values' && (
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => {
              const values = (label === 'A' ? tagsA : tagsB).values ?? []
              return (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                  <p className="text-violet-300 text-xs font-semibold mb-1">Option {label}</p>
                  {values.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {values.map(t => (
                        <span key={t} className="text-[10px] bg-violet-900/25 border border-violet-600/30 text-violet-200/80 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/20 text-[10px] italic">None selected</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Needs only — show all 6 human needs with which are selected */}
        {stepType === 'needs' && (
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(label => {
              const needs = (label === 'A' ? tagsA : tagsB).needs ?? []
              return (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                  <p className="text-rose-300 text-xs font-semibold mb-1">Option {label}</p>
                  {needs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {needs.map(t => (
                        <span key={t} className="text-[10px] bg-rose-900/25 border border-rose-600/30 text-rose-200/80 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/20 text-[10px] italic">None selected</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* AI reflection */}
        {loading && !wordFromUs && (
          <div className="flex items-center justify-center gap-2 text-fuchsia-400/50 text-xs py-3 animate-pulse">
            <span>✦</span> Reflecting on your selections…
          </div>
        )}

        {wordFromUs && (
          <div className="bg-fuchsia-950/40 border border-fuchsia-600/25 rounded-2xl px-4 py-4 space-y-3">
            <p className="text-fuchsia-300 text-xs uppercase tracking-widest font-semibold">A word from Us</p>
            <p className="text-white/80 text-sm leading-relaxed">{wordFromUs}</p>
            {reflection && (
              <>
                <div className="h-px bg-white/10" />
                <p className="text-fuchsia-300 text-xs uppercase tracking-widest font-semibold">Reflection</p>
                <p className="text-white/70 text-sm leading-relaxed">{reflection}</p>
              </>
            )}
          </div>
        )}

        {/* Do ye Agree? */}
        <div className="space-y-3">
          <p className="text-white/30 text-xs text-center tracking-widest">— Do ye Agree? —</p>
          <div className="grid grid-cols-2 gap-2">
            {AGREEMENT_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setAgreement(prev => prev === opt ? null : opt)}
                className={`rounded-full border px-3 py-2 text-xs transition-all flex items-center gap-2 ${
                  agreement === opt
                    ? 'border-fuchsia-400/60 bg-fuchsia-900/30 text-fuchsia-200'
                    : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/70'
                }`}
              >
                <div className={`w-3 h-3 rounded-full border flex-shrink-0 transition-all ${
                  agreement === opt ? 'border-fuchsia-400 bg-fuchsia-400' : 'border-white/30'
                }`} />
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center gap-3 px-5 pb-8 pt-3">
        <button
          onClick={onBack}
          className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onContinue}
          className="flex-1 h-12 rounded-full bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white text-sm font-medium hover:from-fuchsia-600 hover:to-purple-500 transition-all shadow-lg shadow-fuchsia-900/40"
        >
          {CTA_LABEL[stepType]}
        </button>
      </div>
    </div>
  )
}
