'use client'
import Image from 'next/image'
import { useLayoutEffect, useRef, useState } from 'react'

/** The most of the photo (per axis) we'll trim to fill the box. */
const MAX_CROP = 0.3

/**
 * A photo that fills its box as fully as it can without losing much of it
 * (founder feedback 2026-09-27: images felt small in their containers, but
 * aggressive cropping was the earlier complaint). Our art comes in mixed
 * shapes (portrait, square, 3:2) and the boxes vary (wide Library covers,
 * 4:3 / 4:5 cards), so neither plain `cover` (cuts heads off portraits) nor
 * plain `contain` (a small photo floating in blur) works everywhere.
 *
 * The photo starts at `contain` and is scaled up toward `cover`, stopping
 * once MAX_CROP of it would be trimmed. What's left uncovered, if anything,
 * shows the blurred copy behind it, so there are never bare bars. `focusY`
 * picks which part survives a vertical trim (0 top, 1 bottom); the default
 * keeps a little more of the top, where faces and horizons usually are.
 * The scale is static; nothing here animates (docs/MOTION.md).
 */
export default function FittedImage({
  src,
  sizes,
  focusY = 0.4,
  backdropClassName = 'brightness-50',
  priority = false,
  onLoad,
}: {
  src: string
  sizes: string
  focusY?: number
  backdropClassName?: string
  priority?: boolean
  onLoad?: () => void
}) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const [imageRatio, setImageRatio] = useState<number | null>(null)
  const [boxRatio, setBoxRatio] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setBoxRatio(r.width / r.height)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // How far `contain` is from `cover`, capped so at most MAX_CROP is trimmed.
  const scale =
    imageRatio && boxRatio
      ? Math.min(Math.max(imageRatio / boxRatio, boxRatio / imageRatio), 1 / (1 - MAX_CROP))
      : 1

  return (
    <span ref={boxRef} className="absolute inset-0 block overflow-hidden">
      <Image src={src} alt="" aria-hidden fill sizes={sizes} className={`object-cover scale-110 blur-2xl ${backdropClassName}`} />
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
        style={{ transform: `scale(${scale})`, transformOrigin: `50% ${focusY * 100}%` }}
        onLoad={(e) => {
          const img = e.currentTarget
          if (img.naturalWidth && img.naturalHeight) setImageRatio(img.naturalWidth / img.naturalHeight)
          onLoad?.()
        }}
      />
    </span>
  )
}
