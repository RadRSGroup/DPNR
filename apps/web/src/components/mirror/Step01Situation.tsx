'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { MirrorEntry } from '@dpnr/shared-types'
import { DEFAULT_OPENING, TRIGGER_ARCHETYPES, entryFor, patternPrefill, type MirrorOpening } from './openings'
import Dictatable from '@/components/ui/Dictatable'

interface Props {
  initialSituation?: string
  initialTrigger?: string
  /** The archetype picked earlier in this session (resume). */
  initialArchetype?: string
  onComplete: (situation: string, trigger: string, entry: MirrorEntry) => void
  onBack?: () => void
  /** How the person chose to begin on the landing (see openings.ts). */
  opening?: MirrorOpening
}

/** SITUATION — SUBMIT_STEP only, {situation, trigger}, see mirror-steps/situation.ts. */
export default function Step01Situation({ initialSituation = '', initialTrigger = '', initialArchetype, onComplete, onBack, opening = DEFAULT_OPENING }: Props) {
  // A pattern opening pre-fills the situation with the pattern, in plain
  // editable text, so it reaches the AI only if the person keeps it.
  const [situation, setSituation] = useState(
    initialSituation || (opening.mode === 'pattern' ? patternPrefill(opening) : '')
  )
  const [trigger, setTrigger] = useState(initialTrigger)
  const [archetype, setArchetype] = useState(initialArchetype)

  function pickArchetype(name: string) {
    const line = `The part of me that took over felt like the ${name}.`
    setArchetype(name)
    setTrigger((prev) => (prev.trim() ? `${prev.trim()} ${line}` : line).slice(0, 5000))
  }

  function handleContinue() {
    if (!situation.trim() || !trigger.trim()) return
    return onComplete(situation.trim(), trigger.trim(), entryFor(opening, situation, trigger, archetype))
  }

  return (
    <MirrorStepShell step={1} sessionTitle={situation.trim().slice(0, 40) || 'Mirror Room'} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          {opening.mode === 'pattern' && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-900/15 px-4 py-3 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">
                {opening.source === 'confirmed' || opening.source === undefined ? 'Starting from a pattern' : 'Exploring a possible pattern'}
              </p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                {opening.source === 'confirmed' || opening.source === undefined
                  ? 'Describe one recent moment when it showed up.'
                  : `${opening.patternName ?? 'This pattern'} may be showing up for you, or it may not. Describe one recent moment and see whether it fits.`}{' '}
                Edit or remove the pattern line if it doesn&apos;t fit.
              </p>
            </div>
          )}
          {opening.mode === 'situation' && opening.helpIdentify && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-900/15 px-4 py-3 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">Let&apos;s notice it together</p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Start with what happened. As you go, DPNR will reflect back what may be at play and, if something seems to fit, gently name a possible pattern for you to check. You decide whether it feels true.
              </p>
            </div>
          )}
          {opening.mode === 'archetype' && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 animate-settle-in">
              <p className="text-amber-300 text-xs uppercase tracking-wide">Trigger archetypes</p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Think of a recent moment you felt triggered. Which part of you took over? Tap one to add it to your trigger, or write your own.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {TRIGGER_ARCHETYPES.map((name) => (
                  <button
                    key={name}
                    onClick={() => pickArchetype(name)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:text-white hover:border-white/35 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What happened?</p>
            <Dictatable>
              <textarea
                value={situation}
                onChange={e => setSituation(e.target.value.slice(0, 5000))}
                placeholder="Describe the moment, as plainly as you can..."
                rows={4}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{situation.length}/5000</p>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What triggered this for you?</p>
            <Dictatable>
              <textarea
                value={trigger}
                onChange={e => setTrigger(e.target.value.slice(0, 5000))}
                placeholder="What was it, specifically, that set this off?"
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{trigger.length}/5000</p>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label="Continue"
            onClick={handleContinue}
            disabled={!situation.trim() || !trigger.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
