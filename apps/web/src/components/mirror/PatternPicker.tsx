'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ChevronDown, X } from 'lucide-react'
import type { TwinListResponse } from '@dpnr/shared-types'
import { REFERENCE_PATTERNS, findReferencePattern } from '@/lib/mirror-patterns'
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
 */
export default function PatternPicker({ signals, onChoose, onClose }: Props) {
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
            <h3 id="pattern-picker-title" className="font-display text-xl text-white">Start from a pattern</h3>
            <p className="text-sm text-white/65 mt-1 leading-relaxed">
              A pattern is a lens, not a label. Choose one that feels relevant, or start without one.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-white/50 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-glass px-5 pb-2 space-y-5">
          {suggested && (
            <section aria-label="DPNR's suggestion" className="rounded-2xl border border-purple-500/30 bg-purple-900/20 p-4">
              <p className="text-purple-300 text-xs uppercase tracking-wide">
                {suggested.status === 'confirmed' ? 'From what you’ve confirmed' : 'Something DPNR noticed'}
              </p>
              <p className="text-white text-lg mt-1.5">{suggested.name ?? 'A pattern in your reflections'}</p>
              <p className="text-white/80 text-sm mt-1 leading-relaxed">
                {suggested.name ?? 'This pattern'} may be showing up for you. Does it feel relevant to look at now?
              </p>
              <PatternDetails meaning={findReferencePattern(suggested.name)?.meaning} showsUp={suggested.description} own />
              <button
                onClick={() => chooseSignal(suggested)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/95 hover:bg-white text-[var(--color-violet-950)] px-4 py-2 text-sm font-medium transition-colors"
              >
                Explore this <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            </section>
          )}

          {others.length > 0 && (
            <section aria-labelledby="pattern-picker-own">
              <p id="pattern-picker-own" className="text-white/85 text-sm font-medium">Your other patterns</p>
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {others.map((s) => (
                  <PatternRow
                    key={s.signalId}
                    name={s.name ?? s.description}
                    tag={s.status === 'confirmed' ? 'Active' : 'Exploring'}
                    open={openKey === s.signalId}
                    onToggle={() => setOpenKey(openKey === s.signalId ? null : s.signalId)}
                    onChoose={() => chooseSignal(s)}
                  >
                    <PatternDetails meaning={findReferencePattern(s.name)?.meaning} showsUp={s.description} own />
                  </PatternRow>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="pattern-picker-ref">
            <p id="pattern-picker-ref" className="text-white/85 text-sm font-medium">{signals.length > 0 ? 'Other patterns' : 'Browse patterns'}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">Common patterns people notice. None of them is a verdict about you.</p>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {reference.map((p) => (
                <PatternRow
                  key={p.name}
                  name={p.name}
                  open={openKey === p.name}
                  onToggle={() => setOpenKey(openKey === p.name ? null : p.name)}
                  onChoose={() => onChoose({ mode: 'pattern', patternText: p.meaning, patternName: p.name, source: 'reference' })}
                >
                  <PatternDetails meaning={p.meaning} showsUp={p.showsUp} />
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
            <span className="block text-white text-sm">I&apos;m not sure</span>
            <span className="block text-white/55 text-xs mt-0.5">Start with what happened</span>
          </button>
          <button
            onClick={() => onChoose({ mode: 'situation', helpIdentify: true })}
            className="rounded-2xl border border-purple-500/30 bg-purple-900/20 hover:bg-purple-900/35 px-4 py-3 text-start transition-colors"
          >
            <span className="block text-white text-sm">Help me notice what&apos;s happening</span>
            <span className="block text-white/55 text-xs mt-0.5">DPNR looks at it with you as you go</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PatternDetails({ meaning, showsUp, own = false }: { meaning?: string; showsUp: string; own?: boolean }) {
  return (
    <dl className="mt-3 space-y-2 text-sm">
      {meaning && (
        <div>
          <dt className="text-white/50 text-xs">What it is</dt>
          <dd className="text-white/80 leading-relaxed">{meaning}</dd>
        </div>
      )}
      <div>
        <dt className="text-white/50 text-xs">{own ? 'How it may show up for you' : 'How it may show up'}</dt>
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
            Explore this <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      )}
    </li>
  )
}
