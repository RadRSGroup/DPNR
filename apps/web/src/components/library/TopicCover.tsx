import Image from 'next/image'
import type { ExploreTheme } from '@dpnr/shared-types'
import { topicImage } from '@/lib/library/topic-images'

/**
 * A topic's real cover photo (the designer's art, same source as the
 * Library tiles — `topicImage()`), shown whole. The photos come in mixed
 * shapes (3:2, portrait, square), so a fixed `object-cover` box always
 * crops some of them; instead the full image sits on top with
 * `object-contain`, over a blurred, darkened copy of itself that fills the
 * box, so there are never empty letterbox bars and nothing is cut off.
 *
 * Replaces the tiny circular Explore-Theme badges (`THEME_META` crops from
 * the old reference PDF) that the topic page and the chat side panel still
 * showed after Session 65 moved the Library tiles to real photos.
 */
export default function TopicCover({
  slug,
  theme,
  className = 'h-48 lg:h-64',
  sizes = '(min-width: 1024px) 672px, 100vw',
}: {
  slug: string
  theme: ExploreTheme
  className?: string
  sizes?: string
}) {
  const src = topicImage(slug, theme)
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-glass)] ${className}`}>
      <Image src={src} alt="" fill sizes={sizes} className="object-cover scale-110 blur-2xl brightness-50" aria-hidden />
      <Image src={src} alt="" fill sizes={sizes} className="object-contain" priority />
    </div>
  )
}
