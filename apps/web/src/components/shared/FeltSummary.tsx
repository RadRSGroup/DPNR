import type { BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import { BODY_AREAS } from '@/lib/body-map'

interface Props {
  emotionsFelt?: EmotionFelt[]
  bodyPlacements?: BodyPlacement[]
  emotion?: string
  bodyResponse?: string
}

/**
 * The emotion + body capture shown back (Mirror and Decision endings and review pages): the emotions
 * the person chose, where they placed each one, and their own words. Areas
 * are listed head to toe. Renders nothing when there's nothing to show.
 */
export default function FeltSummary({ emotionsFelt = [], bodyPlacements = [], emotion, bodyResponse }: Props) {
  const areaOrder = BODY_AREAS.map((a) => a.area)
  const placedFor = (label: string) =>
    bodyPlacements.filter((p) => p.emotion === label).map((p) => p.area).sort((a, b) => areaOrder.indexOf(a) - areaOrder.indexOf(b))

  if (!emotionsFelt.length && !emotion?.trim() && !bodyResponse?.trim()) return null

  return (
    <div className="space-y-3">
      {(emotionsFelt.length > 0 || emotion?.trim()) && (
        <div className="space-y-2">
          <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">What you felt</p>
          {emotionsFelt.length > 0 && (
            <ul className="space-y-1.5">
              {emotionsFelt.map((e) => {
                const areas = placedFor(e.label)
                return (
                  <li key={e.label} className="flex items-baseline gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: e.color, boxShadow: `0 0 8px ${e.color}` }} aria-hidden />
                    <span className="text-white/85">{e.label}</span>
                    {areas.length > 0 && <span className="text-white/50">· {areas.join(', ')}</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {emotion?.trim() && <p className="text-white/70 text-sm leading-relaxed">{emotion}</p>}
        </div>
      )}
      {bodyResponse?.trim() && (
        <div className="space-y-1">
          <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">Where your body felt it</p>
          <p className="text-white/70 text-sm leading-relaxed">{bodyResponse}</p>
        </div>
      )}
    </div>
  )
}
