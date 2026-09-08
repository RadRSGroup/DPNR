import { HeartHandshake, Compass, Eye, ShieldCheck } from 'lucide-react'
import type { Archetype } from '@dpnr/shared-types'

/**
 * Icon/gradient per `Archetype` — shared by Dashboard and Growth Tracker
 * (both render the same real `archetypes` aggregate from `GET
 * /v1/dashboard`) so the two pages can't visually drift apart over which
 * look means which archetype, same convention `domain-meta.ts` already
 * established for Life Domains. The reference mockup's own portrait-style
 * artwork isn't reproduced here — no such asset exists for this taxonomy,
 * and generating one is outside what this pass can do — so each archetype
 * gets a real, distinct icon+gradient badge instead of an invented photo.
 * Gradient classes are literal Tailwind strings, not composed at render
 * time, for the same JIT-scanning reason `domain-meta.ts` documents.
 */
export const ARCHETYPE_META: Record<Archetype, { icon: typeof HeartHandshake; gradient: string }> = {
  healer: { icon: HeartHandshake, gradient: 'from-[var(--color-magenta-500)] to-[var(--color-violet-500)]' },
  seeker: { icon: Compass, gradient: 'from-[var(--color-violet-400)] to-[var(--color-amber-300)]' },
  visionary: { icon: Eye, gradient: 'from-[var(--color-violet-600)] to-[var(--color-violet-300)]' },
  protector: { icon: ShieldCheck, gradient: 'from-[var(--color-amber-400)] to-[var(--color-violet-800)]' },
}
