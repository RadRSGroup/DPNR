'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { MirrorEntry } from '@dpnr/shared-types'
import Dictatable from '@/components/ui/Dictatable'
import { findReferencePattern } from '@/lib/mirror-patterns'

interface Props {
  sessionTitle: string
  initialCopingResponse?: string
  initialRecurringPattern?: string
  onComplete: (copingResponse: string, recurringPattern: string) => void
  onBack?: () => void
  /** How the person came in (Session 72, #34). */
  entry?: MirrorEntry
}

/**
 * Appendix B entry-aware adaptation: someone who came in through a pattern
 * they already know isn't asked to identify it again; the question explores
 * where else it lives. Same field (`recurringPattern`), different ask.
 */
function recurringQuestion(entry?: MirrorEntry): { question: string; placeholder: string } {
  if (entry?.mode === 'pattern') {
    const named = entry.patternName ? `“${entry.patternName}”` : 'this pattern'
    return {
      question: `Beyond this moment, where else does ${named} tend to show up for you?`,
      placeholder: 'With certain people, places, times, or kinds of pressure...',
    }
  }
  if (entry?.mode === 'archetype' && entry.archetype) {
    return {
      question: `When else does the ${entry.archetype} in you tend to take over?`,
      placeholder: 'Notice the people or situations that seem to call it up...',
    }
  }
  return {
    question: 'Does this happen with certain people or situations?',
    placeholder: 'Notice if this keeps showing up in a particular way...',
  }
}

/**
 * When someone came in through a pattern, this step starts from what's
 * already known about it instead of a blank field (user, 2026-09-29): their
 * own reading of it (a Twin signal, quoted), or for a reference pattern the
 * general "how it may show up" line. Plain, visible, editable text, so the
 * AI sees exactly what the person kept; they add where else it shows up.
 */
function patternPrefill(entry?: MirrorEntry): string {
  if (entry?.mode !== 'pattern') return ''
  if (entry.patternSource === 'reference') {
    const showsUp = findReferencePattern(entry.patternName)?.showsUp
    return showsUp ? `${showsUp}

For me, it tends to show up: ` : ''
  }
  return entry.patternDescription ? `What I've noticed before: "${entry.patternDescription}"

It also shows up: ` : ''
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
  const { question, placeholder } = recurringQuestion(entry)
  const [copingResponse, setCopingResponse] = useState(initialCopingResponse)
  const [recurringPattern, setRecurringPattern] = useState(initialRecurringPattern || patternPrefill(entry))

  function handleContinue() {
    if (!copingResponse.trim() || !recurringPattern.trim()) return
    return onComplete(copingResponse.trim(), recurringPattern.trim())
  }

  return (
    <MirrorStepShell step={3} sessionTitle={sessionTitle} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">How did you cope with it afterward?</p>
            <Dictatable>
              <textarea
                value={copingResponse}
                onChange={e => setCopingResponse(e.target.value.slice(0, 5000))}
                placeholder="Did you shut down, vent to someone, distract yourself..."
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
            label="Continue"
            onClick={handleContinue}
            disabled={!copingResponse.trim() || !recurringPattern.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
