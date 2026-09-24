'use client'
import { useState } from 'react'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { DEFAULT_OPENING, TRIGGER_ARCHETYPES, type MirrorOpening } from './openings'

interface Props {
  initialSituation?: string
  initialTrigger?: string
  onComplete: (situation: string, trigger: string) => void
  onBack?: () => void
  /** How the person chose to begin on the landing (see openings.ts). */
  opening?: MirrorOpening
}

/** SITUATION — SUBMIT_STEP only, {situation, trigger}, see mirror-steps/situation.ts. */
export default function Step01Situation({ initialSituation = '', initialTrigger = '', onComplete, onBack, opening = DEFAULT_OPENING }: Props) {
  // A pattern opening pre-fills the situation with the pattern, in plain
  // editable text, so it reaches the AI only if the person keeps it.
  const [situation, setSituation] = useState(
    initialSituation || (opening.mode === 'pattern' ? `A pattern I keep noticing: "${opening.patternText}"

A recent moment it showed up: ` : '')
  )
  const [trigger, setTrigger] = useState(initialTrigger)

  function pickArchetype(name: string) {
    const line = `The part of me that took over felt like the ${name}.`
    setTrigger((prev) => (prev.trim() ? `${prev.trim()} ${line}` : line).slice(0, 5000))
  }

  function handleContinue() {
    if (!situation.trim() || !trigger.trim()) return
    onComplete(situation.trim(), trigger.trim())
  }

  return (
    <MirrorStepShell step={1} sessionTitle={situation.trim().slice(0, 40) || 'Mirror Room'} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          {opening.mode === 'pattern' && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-900/15 px-4 py-3 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">Starting from a pattern</p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Describe one recent moment when it showed up. Edit or remove the pattern line if it doesn&apos;t fit.
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
            <textarea
              value={situation}
              onChange={e => setSituation(e.target.value.slice(0, 5000))}
              placeholder="Describe the moment, as plainly as you can..."
              rows={4}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{situation.length}/5000</p>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">What triggered this for you?</p>
            <textarea
              value={trigger}
              onChange={e => setTrigger(e.target.value.slice(0, 5000))}
              placeholder="What was it, specifically, that set this off?"
              rows={3}
              className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
            />
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
