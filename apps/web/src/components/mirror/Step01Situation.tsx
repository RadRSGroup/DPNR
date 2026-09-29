'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import MirrorStepShell from './MirrorStepShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { MirrorEntry } from '@dpnr/shared-types'
import { DEFAULT_OPENING, TRIGGER_ARCHETYPES, entryFor, patternPrefill, type MirrorOpening } from './openings'
import Dictatable from '@/components/ui/Dictatable'
import { findReferencePattern } from '@/lib/mirror-patterns'
import { useMirrorPatternLabels } from '@/lib/mirror-pattern-labels'

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
  const t = useTranslations('MirrorRoom')
  const labels = useMirrorPatternLabels()
  // A pattern opening pre-fills the situation with the pattern, in plain
  // editable text, so it reaches the AI only if the person keeps it. The
  // pre-fill is in the person's language (a reference pattern by its
  // translated name); the entry still sends the English name.
  const [situation, setSituation] = useState(
    initialSituation || (opening.mode === 'pattern'
      ? patternPrefill(opening, {
          reference: (name) => t('step1.prefillReference', { name: labels.name(name) }),
          own: (text) => t('step1.prefillOwn', { text }),
        })
      : '')
  )
  const [trigger, setTrigger] = useState(initialTrigger)
  const [archetype, setArchetype] = useState(initialArchetype)

  const shownPatternName = opening.mode === 'pattern' && opening.patternName ? labels.name(opening.patternName) : undefined

  function pickArchetype(name: string) {
    const line = t('step1.archetypeLine', { name: labels.archetype(name) })
    setArchetype(name)
    setTrigger((prev) => (prev.trim() ? `${prev.trim()} ${line}` : line).slice(0, 5000))
  }

  function handleContinue() {
    if (!situation.trim() || !trigger.trim()) return
    // The anchors as shown, so a translated pre-fill still keeps the entry.
    const shown = {
      patternName: opening.mode === 'pattern' && findReferencePattern(opening.patternName) ? shownPatternName : undefined,
      archetype: archetype ? labels.archetype(archetype) : undefined,
    }
    return onComplete(situation.trim(), trigger.trim(), entryFor(opening, situation, trigger, archetype, shown))
  }

  return (
    <MirrorStepShell step={1} sessionTitle={situation.trim().slice(0, 40) || t('title')} onBack={onBack}>
      <div className="flex-1 flex flex-col justify-between pt-4">
        <div className="space-y-6">
          {opening.mode === 'pattern' && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-900/15 px-4 py-3 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">
                {opening.source === 'confirmed' || opening.source === undefined ? t('step1.startingFromPattern') : t('step1.exploringPossible')}
              </p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                {opening.source === 'confirmed' || opening.source === undefined
                  ? t('step1.describeMoment')
                  : shownPatternName
                    ? t('step1.mayOrMayNotNamed', { name: shownPatternName })
                    : t('step1.mayOrMayNotUnnamed')}{' '}
                {t('step1.editLine')}
              </p>
            </div>
          )}
          {opening.mode === 'situation' && opening.helpIdentify && (
            <div className="rounded-2xl border border-purple-500/25 bg-purple-900/15 px-4 py-3 animate-settle-in">
              <p className="text-purple-300 text-xs uppercase tracking-wide">{t('step1.noticeTogetherTitle')}</p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                {t('step1.noticeTogetherBody')}
              </p>
            </div>
          )}
          {opening.mode === 'archetype' && (
            <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 animate-settle-in">
              <p className="text-amber-300 text-xs uppercase tracking-wide">{t('step1.archetypesTitle')}</p>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                {t('step1.archetypesBody')}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {TRIGGER_ARCHETYPES.map((name) => (
                  <button
                    key={name}
                    onClick={() => pickArchetype(name)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:text-white hover:border-white/35 transition-colors"
                  >
                    {labels.archetype(name)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step1.whatHappened')}</p>
            <Dictatable>
              <textarea
                value={situation}
                onChange={e => setSituation(e.target.value.slice(0, 5000))}
                placeholder={t('step1.situationPlaceholder')}
                rows={4}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{situation.length}/5000</p>
          </div>

          <div className="space-y-2">
            <p className="text-white/70 text-sm leading-relaxed">{t('step1.whatTriggered')}</p>
            <Dictatable>
              <textarea
                value={trigger}
                onChange={e => setTrigger(e.target.value.slice(0, 5000))}
                placeholder={t('step1.triggerPlaceholder')}
                rows={3}
                className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </Dictatable>
            <p className="text-[var(--color-text-tertiary)] text-xs text-right">{trigger.length}/5000</p>
          </div>
        </div>

        <div className="pt-6">
          <PrimaryButton
            label={t('continue')}
            onClick={handleContinue}
            disabled={!situation.trim() || !trigger.trim()}
          />
        </div>
      </div>
    </MirrorStepShell>
  )
}
