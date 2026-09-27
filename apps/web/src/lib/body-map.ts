import type { BodyArea, BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import { EMOTION_COLORS } from './types'

/**
 * Tap targets on the Mirror body map's front view
 * (`public/images/mirror/body/body-front.webp`, 540×718, transparent, the last frame of
 * the Drive `Mirror Room/body_rotate.mp4` played in reverse so it settles
 * facing forward). Positions are % of that frame, fitted by eye to the
 * figure. Paired areas have two points; tapping either one selects the area.
 * Decision Room's BODY_LOCATIONS plus arms and legs (user-approved, Session 71).
 */
export const BODY_AREAS: { area: BodyArea; points: { x: number; y: number }[] }[] = [
  { area: 'Head', points: [{ x: 50, y: 21 }] },
  { area: 'Throat', points: [{ x: 50, y: 28.5 }] },
  { area: 'Shoulders', points: [{ x: 39.5, y: 30.5 }, { x: 60.5, y: 30.5 }] },
  { area: 'Chest', points: [{ x: 50, y: 35 }] },
  { area: 'Arms', points: [{ x: 33.5, y: 43 }, { x: 66.5, y: 43 }] },
  { area: 'Stomach', points: [{ x: 50, y: 43 }] },
  { area: 'Hands', points: [{ x: 24.5, y: 53.5 }, { x: 75.5, y: 53.5 }] },
  { area: 'Gut', points: [{ x: 50, y: 50.5 }] },
  { area: 'Legs', points: [{ x: 45.5, y: 72 }, { x: 54.5, y: 72 }] },
]

export const BODY_MEDIA = {
  /** VP9 with alpha: background keyed out, reversed so it settles facing forward. */
  webm: '/images/mirror/body/body.webm',
  poster: '/images/mirror/body/body-front.webp',
  width: 540,
  height: 718,
}

/** The emotion + body capture as the steps hold it (Mirror Step 2, Decision Step 3). */
export interface Felt {
  emotionsFelt: EmotionFelt[]
  bodyPlacements: BodyPlacement[]
  /** Their own words about the feeling. */
  emotion: string
  /** Their own words about the body. */
  bodyResponse: string
}

export const EMPTY_FELT: Felt = { emotionsFelt: [], bodyPlacements: [], emotion: '', bodyResponse: '' }

/**
 * A Decision emotion as the API returns it, as a Felt (Slice 5b). Decisions
 * captured before the body map hold one location + one emotion: a palette
 * emotion becomes a chip placed on that area (when it's a map area), anything
 * else goes back into the person's own words — nothing is invented.
 */
export function feltFromDecisionEmotion(e: {
  bodyLocation: string | null
  emotionColor: string | null
  emotionsFelt?: EmotionFelt[]
  bodyPlacements?: BodyPlacement[]
  emotionWords?: string
  bodyWords?: string
} | null | undefined): Felt {
  if (!e) return EMPTY_FELT
  if (e.emotionsFelt?.length || e.bodyPlacements?.length || e.emotionWords || e.bodyWords) {
    return { emotionsFelt: e.emotionsFelt ?? [], bodyPlacements: e.bodyPlacements ?? [], emotion: e.emotionWords ?? '', bodyResponse: e.bodyWords ?? '' }
  }
  const preset = EMOTION_COLORS.find((c) => c.label === e.emotionColor)
  const area = BODY_AREAS.find((a) => a.area === e.bodyLocation)?.area
  return {
    emotionsFelt: preset ? [{ label: preset.label, color: preset.color }] : [],
    bodyPlacements: preset && area ? [{ area, emotion: preset.label }] : [],
    emotion: preset ? '' : e.emotionColor ?? '',
    bodyResponse: preset && area ? '' : e.bodyLocation ?? '',
  }
}
