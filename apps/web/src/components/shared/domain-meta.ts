import { Flower2, Heart, Briefcase, Flower, CircleDollarSign, Orbit, Moon } from 'lucide-react'
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
// Icons and colors follow the designer's Dashboard reference (Life Domains
// row, docs/reference-screens/platform_photos/refs/dashboard.png), Session 69.
export const DOMAIN_META: Record<LifeDomainCategory, { icon: typeof Heart; color: string; ringClass: string }> = {
  self_inner_world: { icon: Flower2, color: 'var(--color-violet-400)', ringClass: 'stroke-[var(--color-violet-400)]' },
  relationships: { icon: Heart, color: '#fb7185', ringClass: 'stroke-[#fb7185]' },
  career_purpose: { icon: Briefcase, color: 'var(--color-violet-500)', ringClass: 'stroke-[var(--color-violet-500)]' },
  health_body: { icon: Flower, color: 'var(--color-amber-400)', ringClass: 'stroke-[var(--color-amber-400)]' },
  money_abundance: { icon: CircleDollarSign, color: '#4ade80', ringClass: 'stroke-[#4ade80]' },
  creativity_expression: { icon: Orbit, color: '#60a5fa', ringClass: 'stroke-[#60a5fa]' },
  spirituality: { icon: Moon, color: 'var(--color-amber-300)', ringClass: 'stroke-[var(--color-amber-300)]' },
}
