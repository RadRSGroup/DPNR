'use client'
import type { Dispatch, SetStateAction } from 'react'
import type { BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import { EMOTION_COLORS } from '@/lib/types'

interface Props {
  emotionsFelt: EmotionFelt[]
  setEmotionsFelt: Dispatch<SetStateAction<EmotionFelt[]>>
  setBodyPlacements: Dispatch<SetStateAction<BodyPlacement[]>>
}

/**
 * Multi-select emotion chips from the EMOTION_COLORS palette (Mirror Room
 * #35, Decision Room Slice 5b). Turning an emotion off also drops its body
 * placements. Functional updates, so taps within one render all land.
 */
export default function EmotionChips({ emotionsFelt, setEmotionsFelt, setBodyPlacements }: Props) {
  function toggle(label: string, color: string) {
    if (emotionsFelt.some((e) => e.label === label)) {
      setEmotionsFelt((prev) => prev.filter((e) => e.label !== label))
      setBodyPlacements((prev) => prev.filter((p) => p.emotion !== label))
    } else {
      setEmotionsFelt((prev) => (prev.some((e) => e.label === label) ? prev : [...prev, { label, color }]))
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {EMOTION_COLORS.map(({ label, color }) => {
        const on = emotionsFelt.some((e) => e.label === label)
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(label, color)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'text-white' : 'text-white/65 border-white/15 hover:text-white hover:border-white/35'}`}
            style={on ? { borderColor: color, backgroundColor: `${color}2e` } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: on ? `0 0 8px ${color}` : undefined }} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
