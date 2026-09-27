import type { MirrorBodyArea } from '@dpnr/shared-types'

/**
 * Tap targets on the Mirror body map's front view
 * (`public/images/mirror/body/body-front.webp`, 540×718, transparent, the last frame of
 * the Drive `Mirror Room/body_rotate.mp4` played in reverse so it settles
 * facing forward). Positions are % of that frame, fitted by eye to the
 * figure. Paired areas have two points; tapping either one selects the area.
 * Decision Room's BODY_LOCATIONS plus arms and legs (user-approved, Session 71).
 */
export const MIRROR_BODY_AREAS: { area: MirrorBodyArea; points: { x: number; y: number }[] }[] = [
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

export const MIRROR_BODY_MEDIA = {
  /** VP9 with alpha: background keyed out, reversed so it settles facing forward. */
  webm: '/images/mirror/body/body.webm',
  poster: '/images/mirror/body/body-front.webp',
  width: 540,
  height: 718,
}
