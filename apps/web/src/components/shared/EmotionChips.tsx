'use client'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { Plus, X } from 'lucide-react'
import type { BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import { EMOTION_COLORS } from '@/lib/types'
import { useFeltLabels } from '@/lib/felt-labels'

interface Props {
  emotionsFelt: EmotionFelt[]
  setEmotionsFelt: Dispatch<SetStateAction<EmotionFelt[]>>
  setBodyPlacements: Dispatch<SetStateAction<BodyPlacement[]>>
}

/** EmotionFeltSchema's label limit. */
const CUSTOM_MAX = 40
/** Custom emotions share one soft, neutral colour: DPNR doesn't assign meaning to a word it didn't offer. */
const CUSTOM_COLOR = '#c4b5fd'

/**
 * Multi-select emotion chips from the EMOTION_COLORS palette (Mirror Room
 * #35, Decision Room Slice 5b, Feel / Body). Turning an emotion off also
 * drops its body placements. Functional updates, so taps within one render
 * all land.
 *
 * "Something else" (founder, 2026-09-29: the range felt limited) lets the
 * person name their own feeling. It becomes a chip like the others and can
 * be placed on the body. EmotionFeltSchema already takes any label up to 40
 * characters, so rooms accept it with no backend change.
 */
export default function EmotionChips({ emotionsFelt, setEmotionsFelt, setBodyPlacements }: Props) {
  const labels = useFeltLabels()
  const [writing, setWriting] = useState(false)
  const [draft, setDraft] = useState('')
  const palette = new Set(EMOTION_COLORS.map((e) => e.label as string))
  const custom = emotionsFelt.filter((e) => !palette.has(e.label))

  function toggle(label: string, color: string) {
    if (emotionsFelt.some((e) => e.label === label)) {
      setEmotionsFelt((prev) => prev.filter((e) => e.label !== label))
      setBodyPlacements((prev) => prev.filter((p) => p.emotion !== label))
    } else {
      setEmotionsFelt((prev) => (prev.some((e) => e.label === label) ? prev : [...prev, { label, color }]))
    }
  }

  function addCustom() {
    const label = draft.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_MAX)
    if (!label) return
    // Typing a palette word (in either language) just selects that chip.
    const match = EMOTION_COLORS.find(
      (e) => e.label.toLowerCase() === label.toLowerCase() || labels.emotion(e.label).toLowerCase() === label.toLowerCase()
    )
    const chosen = match ? { label: match.label as string, color: match.color } : { label, color: CUSTOM_COLOR }
    setEmotionsFelt((prev) =>
      prev.some((e) => e.label.toLowerCase() === chosen.label.toLowerCase()) ? prev : [...prev, chosen]
    )
    setDraft('')
    setWriting(false)
  }

  const chipClass = (on: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'text-white' : 'text-white/65 border-white/15 hover:text-white hover:border-white/35'}`

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {EMOTION_COLORS.map(({ label, color }) => {
          const on = emotionsFelt.some((e) => e.label === label)
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(label, color)}
              className={chipClass(on)}
              style={on ? { borderColor: color, backgroundColor: `${color}2e` } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: on ? `0 0 8px ${color}` : undefined }} aria-hidden />
              {labels.emotion(label)}
            </button>
          )
        })}
        {custom.map(({ label, color }) => (
          <button
            key={label}
            type="button"
            onClick={() => toggle(label, color)}
            aria-label={labels.t('removeCustom', { label })}
            className={chipClass(true)}
            style={{ borderColor: color, backgroundColor: `${color}2e` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} aria-hidden />
            {label}
            <X className="h-3 w-3 opacity-70" aria-hidden />
          </button>
        ))}
        {!writing && (
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-white/25 px-3 py-1.5 text-xs text-white/65 hover:text-white hover:border-white/45 transition-colors"
          >
            <Plus className="h-3 w-3" aria-hidden /> {labels.t('somethingElse')}
          </button>
        )}
      </div>
      {writing && (
        // A div, not a <form>: room steps may already sit inside one.
        <div className="flex gap-2 animate-fade-in">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, CUSTOM_MAX))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addCustom() }
              if (e.key === 'Escape') { e.stopPropagation(); setWriting(false); setDraft('') }
            }}
            autoFocus
            maxLength={CUSTOM_MAX}
            placeholder={labels.t('customPlaceholder')}
            aria-label={labels.t('customPlaceholder')}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-base sm:text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!draft.trim()}
            className="rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] disabled:bg-white/10 disabled:text-white/40 px-4 py-2 text-sm text-white transition-colors"
          >
            {labels.t('addCustom')}
          </button>
        </div>
      )}
    </div>
  )
}
