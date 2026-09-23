import type { ExploreTheme, GuidanceCardTopic } from '@dpnr/shared-types'

/**
 * Real per-topic cover art from the designer
 * (`docs/reference-screens/theme_and_section_photos/`), converted to .webp
 * by `apps/web/scripts/build-library-images.py`, whose TOPIC_FILES map is
 * the other half of this list — keep the two in sync.
 *
 * 43 of the catalog's 58 topics have their own photo. The other 15
 * (Emotional Regulation, all 7 NEED topics, all 4 REPAIR topics, all 3
 * CHOOSE topics) have no art yet and fall back to their Explore Theme's own
 * art (the icon-free inner crop, `themes/<theme>-art.webp`), so every tile
 * still shows a real image, just not a topic-specific one.
 *
 * Kept frontend-only (keyed by slug) rather than stored on the catalog
 * item, so swapping art never needs a catalog reseed or deploy.
 */
const TOPICS_WITH_PHOTO = new Set([
  'identity-vs-roles', 'self-worth-vs-performance', 'self-trust', 'authenticity', 'inner-critic',
  'self-love', 'self-acceptance', 'self-respect',
  'emotion-vs-reaction', 'emotional-triggers', 'anger', 'shame-vs-guilt', 'grief-and-letting-go',
  'avoidance', 'people-pleasing', 'perfectionism', 'control', 'overthinking-and-rumination', 'procrastination',
  'attachment-styles-overview', 'anxious-attachment-pattern', 'avoidant-attachment-pattern',
  'fearful-avoidant-push-pull-pattern', 'secure-relating', 'relationship-red-flags-vs-triggers',
  'boundaries', 'boundary-vs-ultimatum',
  'body-signals', 'fight-flight-freeze-and-fawn', 'window-of-tolerance', 'rest-recovery-and-depletion',
  'ambition', 'money-meaning', 'creative-block', 'success-and-enough', 'abundance',
  'inner-child-a-practical-lens', 'limiting-beliefs', 'meaning-vs-happiness', 'gratitude',
  'joy-and-play', 'purpose', 'integration',
])

export function topicImage(slug: string, theme: ExploreTheme): string {
  return TOPICS_WITH_PHOTO.has(slug)
    ? `/images/library/topics/${slug}.webp`
    : `/images/library/themes/${theme.toLowerCase()}-art.webp`
}

/** Explore by Theme card art, glass frame and icon included. */
export function themeCover(theme: ExploreTheme): string {
  return `/images/library/themes/${theme.toLowerCase()}.webp`
}

export const LIBRARY_HEADER_IMAGE = '/images/library/header.webp'

/** The designer's "For You" art: one shared card, the topic name set bold in the middle. */
export const FOR_YOU_IMAGE = '/images/library/for-you.webp'

/** The designer's 8 Start Here cards, one per Start Here slot, in order. */
export const START_HERE_IMAGES = Array.from({ length: 8 }, (_, i) => `/images/library/start-here/${i + 1}.webp`)

/**
 * Pull a Card backgrounds, one per card topic, reusing the Library's own
 * photos (confirmed with the user: no dedicated card art exists yet, and the
 * designer's card reference has its text baked into the image). Each is a
 * judgment-call pairing by mood, not a literal topic match — NEEDS has no
 * photo of its own, so it borrows Success & Enough's lakeside scene, the
 * closest in feel to the reference card itself. Resolved client-side from the
 * pull response's `topic`, so the seeded `imageRef` (still the old single
 * placeholder on every card) doesn't need reseeding.
 */
const CARD_TOPIC_IMAGES: Record<GuidanceCardTopic, string> = {
  SELF: topicImage('self-trust', 'ME'),
  FEEL: topicImage('emotion-vs-reaction', 'FEEL'),
  PATTERNS: topicImage('overthinking-and-rumination', 'PATTERNS'),
  NEEDS: topicImage('success-and-enough', 'CREATE'),
  LOVE: topicImage('secure-relating', 'RELATE'),
  COURAGE: topicImage('ambition', 'CREATE'),
  BODY: topicImage('body-signals', 'BODY'),
  NEXT: topicImage('decision-making', 'CHOOSE'), // no photo yet → Decisions & Direction's own art
  CREATE: topicImage('creative-block', 'CREATE'),
  LIFE: topicImage('gratitude', 'LIFE'),
}

/** Shown before the first pull. */
export const CARD_DEFAULT_IMAGE = CARD_TOPIC_IMAGES.NEEDS

export function cardImage(topic: GuidanceCardTopic): string {
  return CARD_TOPIC_IMAGES[topic]
}
