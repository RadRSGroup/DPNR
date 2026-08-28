import { Heart, Users, Briefcase, Activity, Wallet, Palette, Flower2 } from 'lucide-react'
import type { LifeDomainCategory } from '@dpnr/shared-types'

/**
 * Icon/color per `LifeDomainCategory` — shared by Growth Tracker and My
 * Evolution Map (both render the same real `lifeDomains` aggregate from
 * `GET /v1/dashboard`) so the two pages can't visually drift apart over
 * which color/icon means which domain. `ringClass` is a literal Tailwind
 * arbitrary-value class per entry (not composed from `color` at render
 * time) — Tailwind's JIT scanner only picks up class names that appear as
 * complete literal strings in source, so building `stroke-[${color}]` at
 * runtime would silently fail to generate the CSS.
 */
export const DOMAIN_META: Record<LifeDomainCategory, { icon: typeof Heart; color: string; ringClass: string }> = {
  self_inner_world: { icon: Heart, color: 'var(--color-magenta-500)', ringClass: 'stroke-[var(--color-magenta-500)]' },
  relationships: { icon: Users, color: 'var(--color-violet-400)', ringClass: 'stroke-[var(--color-violet-400)]' },
  career_purpose: { icon: Briefcase, color: 'var(--color-violet-500)', ringClass: 'stroke-[var(--color-violet-500)]' },
  health_body: { icon: Activity, color: 'var(--color-amber-400)', ringClass: 'stroke-[var(--color-amber-400)]' },
  money_abundance: { icon: Wallet, color: 'var(--color-amber-300)', ringClass: 'stroke-[var(--color-amber-300)]' },
  creativity_expression: { icon: Palette, color: 'var(--color-violet-300)', ringClass: 'stroke-[var(--color-violet-300)]' },
  spirituality: { icon: Flower2, color: 'var(--color-violet-600)', ringClass: 'stroke-[var(--color-violet-600)]' },
}
