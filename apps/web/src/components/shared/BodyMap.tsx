'use client'
import { useEffect, useRef, useState } from 'react'
import type { BodyArea, BodyPlacement, EmotionFelt } from '@dpnr/shared-types'
import { BODY_AREAS, BODY_MEDIA } from '@/lib/body-map'

interface Props {
  emotions: EmotionFelt[]
  placements: BodyPlacement[]
  onChange: (placements: BodyPlacement[]) => void
}

/**
 * Emotion → body map, shared by the Mirror Room (founder feedback #35, design approved
 * 2026-09-27) and the Decision Room (Slice 5b). The body comes forward and turns once to face the person
 * (the Drive clip reversed, so it settles on the front view), then the
 * areas become tappable. The person places each chosen emotion themselves;
 * DPNR never picks or suggests a location (Appendix B). Nothing is scored.
 *
 * The clip is a VP9 webm with a real alpha channel (background keyed out
 * at transcode time), so the room shows through without blend modes, which
 * the step's transformed, isolated ancestors would break. Browsers that
 * decode it without alpha (Safari) or can't play it, and reduced motion,
 * get the transparent front still instead: the first frame's corner pixel is
 * checked before the video is shown.
 */
export default function BodyMap({ emotions, placements, onChange }: Props) {
  const [active, setActive] = useState(emotions[0]?.label ?? '')
  const [ready, setReady] = useState(false)
  const [still, setStill] = useState(false)
  const [videoShown, setVideoShown] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Emotions can be removed while this is open; keep the active one valid.
  const activeLabel = emotions.some((e) => e.label === active) ? active : emotions[0]?.label ?? ''
  const colorOf = (label: string) => emotions.find((e) => e.label === label)?.color ?? '#ffffff'

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const video = videoRef.current
    if (isReduced || !video || !video.canPlayType('video/webm; codecs="vp9"')) {
      // Decided once on mount: the clip either plays or it doesn't.
      showStill()
      return
    }
    // Autoplay can be refused (Low Power Mode, data saver): fall back to the still.
    video.play().catch(showStill)
  }, [])

  function showStill() {
    setStill(true)
    setReady(true)
  }

  /** Shows the video only if its first frame really has a transparent background. */
  function checkAlpha() {
    const video = videoRef.current
    if (!video) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, 64, 64)
      const alpha = ctx?.getImageData(1, 1, 1, 1).data[3] ?? 255
      if (alpha < 32) setVideoShown(true)
      else showStill()
    } catch {
      showStill()
    }
  }

  function toggle(area: BodyArea) {
    if (!activeLabel) return
    const exists = placements.some((p) => p.area === area && p.emotion === activeLabel)
    onChange(exists
      ? placements.filter((p) => !(p.area === area && p.emotion === activeLabel))
      : [...placements, { area, emotion: activeLabel }])
  }

  const placedHere = (area: BodyArea) => placements.filter((p) => p.area === area)

  return (
    <div className="space-y-4 animate-settle-in">
      <div className="space-y-1">
        <p className="text-white/70 text-sm leading-relaxed">Where did you feel it in your body?</p>
        <p className="text-[var(--color-text-tertiary)] text-xs leading-relaxed">
          {emotions.length > 1 ? 'Choose a feeling, then tap where it sat. Tap again to remove it.' : 'Tap where it sat. Tap again to remove it.'}
        </p>
      </div>

      {emotions.length > 1 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Feeling to place">
          {emotions.map((e) => {
            const on = e.label === activeLabel
            return (
              <button
                key={e.label}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setActive(e.label)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? 'text-white' : 'text-white/60 border-white/15 hover:text-white'}`}
                style={on ? { borderColor: e.color, backgroundColor: `${e.color}26` } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} aria-hidden />
                {e.label}
              </button>
            )
          })}
        </div>
      )}

      <div
        className="relative mx-auto w-full max-w-[280px] lg:max-w-[300px]"
        style={{ aspectRatio: `${BODY_MEDIA.width} / ${BODY_MEDIA.height}` }}
      >
        {still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={BODY_MEDIA.poster} alt="" className="absolute inset-0 h-full w-full animate-fade-in" />
        ) : (
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full transition-opacity ${videoShown ? 'opacity-100' : 'opacity-0'}`}
            muted
            playsInline
            preload="auto"
            aria-hidden
            onLoadedData={checkAlpha}
            onEnded={() => setReady(true)}
            onError={showStill}
          >
            <source src={BODY_MEDIA.webm} type="video/webm; codecs=vp9" />
          </video>
        )}

        {ready && BODY_AREAS.map(({ area, points }) => {
          const here = placedHere(area)
          const mine = here.some((p) => p.emotion === activeLabel)
          return points.map((pt, i) => (
            <div
              key={`${area}-${i}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 animate-fade-in"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            >
              {here.map((p, j) => (
                <span
                  key={p.emotion}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 m-auto h-11 w-11 rounded-full animate-soft-glow"
                  style={{
                    background: `radial-gradient(circle, ${colorOf(p.emotion)} 0%, ${colorOf(p.emotion)}66 35%, transparent 70%)`,
                    marginLeft: `${(j - (here.length - 1) / 2) * 8}px`,
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => toggle(area)}
                aria-label={area}
                aria-pressed={mine}
                title={area}
                className={`relative block h-7 w-7 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  mine ? 'border-white/80' : 'border-transparent hover:border-white/50'
                }`}
              >
                <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden />
              </button>
            </div>
          ))
        })}
      </div>

      {/* The same choice as a list: easier to hit precisely, and readable by screen readers. */}
      {ready && (
        <div className="flex flex-wrap justify-center gap-1.5 animate-fade-in">
          {BODY_AREAS.map(({ area }) => {
            const here = placedHere(area)
            const mine = here.some((p) => p.emotion === activeLabel)
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggle(area)}
                aria-pressed={mine}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  mine ? 'border-white/60 text-white' : 'border-white/15 text-white/55 hover:text-white'
                }`}
              >
                {here.map((p) => (
                  <span key={p.emotion} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorOf(p.emotion) }} aria-hidden />
                ))}
                {area}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
