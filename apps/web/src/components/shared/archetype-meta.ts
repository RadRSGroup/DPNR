import { HeartHandshake, Compass, Eye, ShieldCheck } from 'lucide-react'
import type { Archetype } from '@dpnr/shared-types'

/**
 * Icon/gradient/portrait per `Archetype` — shared by Dashboard and Growth
 * Tracker (both render the same real `archetypes` aggregate from `GET
 * /v1/dashboard`) so the two pages can't visually drift apart over which
 * look means which archetype, same convention `domain-meta.ts` already
 * established for Life Domains. `image` is a real portrait crop from the
 * reference PDF's own Dashboard page ("Leading Archetypes" row, docs/UI
 * reference for platform.pdf page 2) — that row already uses this app's
 * real enum labels (Healer/Seeker/Visionary/Protector) verbatim, unlike
 * Growth Tracker's own reference page which shows a mismatched label set
 * (Explorer/Creator/Healer/Visionary) for the same concept, so these crops
 * are the correct source, not a relabeling exercise. `icon`/`gradient` stay
 * as the fallback badge for any future archetype with no portrait yet.
 * Gradient classes are literal Tailwind strings, not composed at render
 * time, for the same JIT-scanning reason `domain-meta.ts` documents.
 */
export const ARCHETYPE_META: Record<Archetype, { icon: typeof HeartHandshake; gradient: string; image: string }> = {
  healer: { icon: HeartHandshake, gradient: 'from-[var(--color-magenta-500)] to-[var(--color-violet-500)]', image: '/images/archetypes/healer.webp' },
  seeker: { icon: Compass, gradient: 'from-[var(--color-violet-400)] to-[var(--color-amber-300)]', image: '/images/archetypes/seeker.webp' },
  visionary: { icon: Eye, gradient: 'from-[var(--color-violet-600)] to-[var(--color-violet-300)]', image: '/images/archetypes/visionary.webp' },
  protector: { icon: ShieldCheck, gradient: 'from-[var(--color-amber-400)] to-[var(--color-violet-800)]', image: '/images/archetypes/protector.webp' },
}
