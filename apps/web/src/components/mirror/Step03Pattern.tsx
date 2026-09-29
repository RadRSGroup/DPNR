'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { MirrorEntry } from '@dpnr/shared-types'
import Dictatable from '@/components/ui/Dictatable'
import { findReferencePattern } from '@/lib/mirror-patterns'
import { useMirrorPatternLabels } from '@/lib/mirror-pattern-labels'

interface Props {
  sessionTitle: string
  initialCopingResponse?: string
  initialRecurringPattern?: string
  onComplete: (copingResponse: string, recurringPattern: string) => void
  onBack?: () => void
  /** How the person came in (Session 72, #34). */
  entry?: MirrorEntry
}

type T = ReturnType<typeof useTranslations>
type Labels = ReturnType<typeof useMirrorPatternLabels>

/**
 * Appendix B entry-aware adaptation: someone who came in through a pattern
 * they already know isn't asked to identify it again; the question explores
 * where else it lives. Same field (`recurringPattern`), different ask.
 */
function recurringQuestion(t: T, labels: Labels, entry?: MirrorEntry): { question: string; placeholder: string } {
  if (entry?.mode === 'pattern') {
    return {
      question: entry.patternName
        ? t('step3.patternQuestionNamed', { name: labels.name(entry.patternName) })
        : t('step3.patternQuestionUnnamed'),
      placeholder: t('step3.patternPlaceholder'),
    }
  }
  if (entry?.mode === 'archetype' && entry.archetype) {
    return {
      question: t('step3.archetypeQuestion', { name: labels.archetype(entry.archetype) }),
      placeholder: t('step3.archetypePlaceholder'),
    }
  }
  return {
    question: t('step3.defaultQuestion'),
    placeholder: t('step3.defaultPlaceholder'),
  }
}

/**
 * When someone came in through a pattern, this step starts from what's
 * already known about it instead of a blank field (user, 2026-09-29): their
 * own reading of it (a Twin signal, quoted), or for a reference pattern the
 * general "how it may show up" line. Plain, visible, editable text, so the
 * AI sees exactly what the person kept; they add where else it shows up.
 * Written in the person's language (the translated "how it may show up"
 * line in Hebrew); it is free text, and nothing downstream matches on it.
 */
function patternPrefill(t: T, labels: Labels, entry?: MirrorEntry): string {
  if (entry?.mode !== 'pattern') return ''
  if (entry.patternSource === 'reference') {
    const ref = findReferencePattern(entry.patternName)
    return ref ? t('step3.prefillReference', { showsUp: labels.showsUp(ref) }) : ''
  }
  return entry.patternDescription ? t('step3.prefillOwn', { text: entry.patternDescription }) : ''
}

/** PATTERN — SUBMIT_STEP only, {copingResponse, recurringPattern}, see mirror-steps/pattern.ts. */
export default function Step03Pattern({
  sessionTitle,
  initialCopingResponse = '',
  initialRecurringPattern = '',
  onComplete,
  onBack,
  entry,
}: Props) {
  const t = useTranslations('MirrorRoom')
  const labels = useMirrorPatternLabels()
  const { question, placeholder } = recurringQuestion(t, labels, entry)
  const [copingResponse, setCopingResponse] = useState(initialCopingResponse)
  const [recurringPattern, setRecurringPattern] = useState(initialRecurringPattern || patternPrefill(t, labels, entry))

  function handleContinue() {
    if (!copingResponse.trim() || !recurringPattern.trim()) return
    return onComplete(copingResponse.trim(), recurringPattern.trim())
  }

  return (
    <MirrorStepShell step={3} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step3.copingQuestion')}</p>
            <Dictatable>
              <textarea
                value={copingResponse}
                onChange={e => setCopingResponse(e.target.value.slice(0, 5000))}
                placeholder={t('step3.copingPlaceholder')}
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{question}</p>
            <Dictatable>
              <textarea
                value={recurringPattern}
                onChange={e => setRecurringPattern(e.target.value.slice(0, 5000))}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label={t('continue')}
            onClick={handleContinue}
            disabled={!copingResponse.trim() || !recurringPattern.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
