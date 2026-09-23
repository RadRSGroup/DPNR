import type { ExploreTheme, GuidanceCardTopic } from '@dpnr/shared-types'

/**
 * Real per-topic cover art from the designer
 * (`docs/reference-screens/theme_and_section_photos/`), converted to .webp
 * by `apps/web/scripts/build-library-images.py`, whose TOPIC_FILES map is
 * the other half of this list — keep the two in sync.
 *
 * 43 of the catalog's 58 topics have their own photo. The other 15 borrow
 * another topic's photo as a stopgap (PLACEHOLDER_TOPIC_PHOTOS below), and
 * anything missing from both falls back to its Explore Theme's own art.
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

/**
 * PLACEHOLDER — REPLACE WHEN REAL ART ARRIVES. These 15 topics have no photo
 * of their own yet, so each borrows the existing photo closest to it in
 * meaning (user's call, Session 65: "use existing photos with a flag for
 * them to be updated later"). The same list, for the designer, is in
 * `docs/reference-screens/PHOTOS_NEEDED.md`.
 * To replace one: add the real file under `theme_and_section_photos/` and to TOPIC_FILES in
 * `apps/web/scripts/build-library-images.py`, re-run the script, move the
 * slug into TOPICS_WITH_PHOTO above, and delete its line here.
 */
export const PLACEHOLDER_TOPIC_PHOTOS: Record<string, string> = {
  'emotional-regulation': 'window-of-tolerance',
  'needs-vs-neediness': 'anxious-attachment-pattern',
  'six-broad-human-needs': 'integration',
  'basic-everyday-needs': 'rest-recovery-and-depletion',
  'competing-needs': 'relationship-red-flags-vs-triggers',
  'values': 'self-trust',
  'values-vs-rules': 'control',
  'value-conflicts': 'fearful-avoidant-push-pull-pattern',
  'assertiveness': 'self-respect',
  'conflict-and-repair': 'attachment-styles-overview',
  'forgiveness': 'grief-and-letting-go',
  'self-compassion': 'inner-child-a-practical-lens',
  'decision-making': 'meaning-vs-happiness',
  'fear-vs-desire-in-decisions': 'avoidance',
  'future-self': 'ambition',
}

export function hasPlaceholderPhoto(slug: string): boolean {
  return slug in PLACEHOLDER_TOPIC_PHOTOS
}

export function topicImage(slug: string, theme: ExploreTheme): string {
  if (TOPICS_WITH_PHOTO.has(slug)) return `/images/library/topics/${slug}.webp`
  const borrowed = PLACEHOLDER_TOPIC_PHOTOS[slug]
  if (borrowed) return `/images/library/topics/${borrowed}.webp`
  return themeArt(theme)
}

/** A theme's icon-free inner art (used where no topic photo applies). */
export function themeArt(theme: ExploreTheme): string {
  return `/images/library/themes/${theme.toLowerCase()}-art.webp`
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
  NEXT: themeArt('CHOOSE'),
  CREATE: topicImage('creative-block', 'CREATE'),
  LIFE: topicImage('gratitude', 'LIFE'),
}

/** Shown before the first pull. */
export const CARD_DEFAULT_IMAGE = CARD_TOPIC_IMAGES.NEEDS

export function cardImage(topic: GuidanceCardTopic): string {
  return CARD_TOPIC_IMAGES[topic]
}
