'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronDown, X } from 'lucide-react'
import type { TwinListResponse } from '@dpnr/shared-types'
import { REFERENCE_PATTERNS, findReferencePattern } from '@/lib/mirror-patterns'
import { useMirrorPatternLabels } from '@/lib/mirror-pattern-labels'
import type { MirrorOpening } from './openings'

type Signal = TwinListResponse['signals'][number]

interface Props {
  /** The person's own pattern signals (confirmed + exploring), best first. */
  signals: Signal[]
  onChoose: (opening: MirrorOpening) => void
  onClose: () => void
}

/**
 * "By Pattern" (founder feedback #33, Session 77). DPNR may suggest one of
 * the person's own patterns, but they can also browse others (their own and
 * Appendix A's reference list), start without knowing, or ask DPNR to help
 * notice what may be happening. Tentative language throughout: a pattern is
 * a lens, never a label for the person. Nothing is written from here — the
 * choice only shapes how Mirror step 1 opens (see openings.ts).
 * Reference patterns are shown translated (useMirrorPatternLabels) but the
 * choice still carries the English name + meaning.
 */
export default function PatternPicker({ signals, onChoose, onClose }: Props) {
  const t = useTranslations('MirrorRoom')
  const labels = useMirrorPatternLabels()
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The suggestion: the strongest confirmed pattern, else the strongest one
  // still being explored. Never invented when the person has none.
  const suggested = signals.find((s) => s.status === 'confirmed') ?? signals[0]
  const others = signals.filter((s) => s !== suggested)
  const ownNames = new Set(signals.map((s) => findReferencePattern(s.name)?.name).filter(Boolean))
  const reference = REFERENCE_PATTERNS.filter((p) => !ownNames.has(p.name))

  function chooseSignal(s: Signal) {
    onChoose({
      mode: 'pattern',
      patternText: s.description,
      patternName: s.name,
      source: s.status === 'confirmed' ? 'confirmed' : 'exploring',
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="pattern-picker-title">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-[520px] max-h-[88vh] flex flex-col rounded-3xl border border-white/10 bg-[#130d1f] animate-settle-in">
        <div className="flex items-start gap-3 p-5 pb-3">
          <div className="flex-1">
            <h3 id="pattern-picker-title" className="font-display text-xl text-white">{t('picker.title')}</h3>
            <p className="text-sm text-white/65 mt-1 leading-relaxed">
              {t('picker.intro')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('picker.close')} className="rounded-full p-1.5 text-white/50 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-glass px-5 pb-2 space-y-5">
          {suggested && (
            <section aria-label={t('picker.suggestionAria')} className="rounded-2xl border border-purple-500/30 bg-purple-900/20 p-4">
              <p className="text-purple-300 text-xs uppercase tracking-wide">
                {suggested.status === 'confirmed' ? t('picker.fromConfirmed') : t('picker.dpnrNoticed')}
              </p>
              <p className="text-white text-lg mt-1.5">{suggested.name ? labels.name(suggested.name) : t('picker.unnamed')}</p>
              <p className="text-white/80 text-sm mt-1 leading-relaxed">
                {suggested.name
                  ? t('picker.mayBeShowingUpNamed', { name: labels.name(suggested.name) })
                  : t('picker.mayBeShowingUpUnnamed')}
              </p>
              <PatternDetails meaning={labels.meaning(findReferencePattern(suggested.name))} showsUp={suggested.description} own />
              <button
                onClick={() => chooseSignal(suggested)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/95 hover:bg-white text-[var(--color-violet-950)] px-4 py-2 text-sm font-medium transition-colors"
              >
                {t('picker.exploreThis')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            </section>
          )}

          {others.length > 0 && (
            <section aria-labelledby="pattern-picker-own">
              <p id="pattern-picker-own" className="text-white/85 text-sm font-medium">{t('picker.yourOthers')}</p>
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {others.map((s) => (
                  <PatternRow
                    key={s.signalId}
                    name={s.name ? labels.name(s.name) : s.description}
                    tag={s.status === 'confirmed' ? t('tags.confirmed') : t('tags.candidate')}
                    open={openKey === s.signalId}
                    onToggle={() => setOpenKey(openKey === s.signalId ? null : s.signalId)}
                    onChoose={() => chooseSignal(s)}
                  >
                    <PatternDetails meaning={labels.meaning(findReferencePattern(s.name))} showsUp={s.description} own />
                  </PatternRow>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="pattern-picker-ref">
            <p id="pattern-picker-ref" className="text-white/85 text-sm font-medium">{signals.length > 0 ? t('picker.otherPatterns') : t('picker.browsePatterns')}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{t('picker.referenceNote')}</p>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {reference.map((p) => (
                <PatternRow
                  key={p.name}
                  name={labels.name(p.name)}
                  open={openKey === p.name}
                  onToggle={() => setOpenKey(openKey === p.name ? null : p.name)}
                  onChoose={() => onChoose({ mode: 'pattern', patternText: p.meaning, patternName: p.name, source: 'reference' })}
                >
                  <PatternDetails meaning={labels.meaning(p)} showsUp={labels.showsUp(p)} />
                </PatternRow>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-white/10 p-4 grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => onChoose({ mode: 'situation' })}
            className="rounded-2xl border border-white/12 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-3 text-start transition-colors"
          >
            <span className="block text-white text-sm">{t('picker.notSure')}</span>
            <span className="block text-white/55 text-xs mt-0.5">{t('picker.notSureHint')}</span>
          </button>
          <button
            onClick={() => onChoose({ mode: 'situation', helpIdentify: true })}
            className="rounded-2xl border border-purple-500/30 bg-purple-900/20 hover:bg-purple-900/35 px-4 py-3 text-start transition-colors"
          >
            <span className="block text-white text-sm">{t('picker.helpNotice')}</span>
            <span className="block text-white/55 text-xs mt-0.5">{t('picker.helpNoticeHint')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PatternDetails({ meaning, showsUp, own = false }: { meaning?: string; showsUp: string; own?: boolean }) {
  const t = useTranslations('MirrorRoom')
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {meaning && (
        <div>
          <dt className="text-white/50 text-xs">{t('picker.whatItIs')}</dt>
          <dd className="text-white/80 leading-relaxed">{meaning}</dd>
        </div>
      )}
      <div>
        <dt className="text-white/50 text-xs">{own ? t('picker.howShowsUpForYou') : t('picker.howShowsUp')}</dt>
        <dd className="text-white/80 leading-relaxed">{showsUp}</dd>
      </div>
    </dl>
  )
}

function PatternRow({
  name,
  tag,
  open,
  onToggle,
  onChoose,
  children,
}: {
  name: string
  tag?: string
  open: boolean
  onToggle: () => void
  onChoose: () => void
  children: React.ReactNode
}) {
  const t = useTranslations('MirrorRoom')
  return (
    <li className="py-1">
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 py-2 text-start">
        <span className="flex-1 min-w-0 text-sm text-white/90 truncate">{name}</span>
        {tag && <span className="shrink-0 rounded-full bg-[var(--color-violet-600)]/30 text-[var(--color-violet-200)] text-[10px] px-2 py-0.5">{tag}</span>}
        <ChevronDown className={`w-4 h-4 shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-3 animate-settle-in">
          {children}
          <button onClick={onChoose} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-violet-300)] hover:text-white transition-colors">
            {t('picker.exploreThis')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      )}
    </li>
  )
}
