/**
 * Motion helpers (docs/MOTION.md). Tailwind only generates classes it can
 * see written out in full, so staggered sequences index into this list
 * instead of building `stagger-${i}` at runtime.
 */
export const STAGGER_CLASSES = ['stagger-0', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5'] as const

export function staggerClass(index: number): string {
  return STAGGER_CLASSES[Math.min(index, STAGGER_CLASSES.length - 1)]
}
