import { staggerClass } from '@/lib/motion'

/**
 * Calm "the AI is working on this" placeholder for room steps (docs/MOTION.md,
 * Session 69) — replaces spinners and blinking `animate-pulse` text. Soft
 * bars in roughly the shape of what's coming (`lines` for prose/statements,
 * `chips` for suggestion chips), breathing in sequence. Opacity only, so it
 * needs no separate reduced-motion treatment.
 */
export default function AiThinking({
  label,
  shape = 'lines',
  count = 3,
  className = '',
}: {
  /** Short, plain status line, e.g. "Reflecting on your selections…". */
  label: string
  shape?: 'lines' | 'chips' | 'cards'
  count?: number
  className?: string
}) {
  const items = Array.from({ length: count })
  return (
    <div role="status" aria-live="polite" className={`w-full space-y-3 animate-fade-in ${className}`}>
      {shape === 'chips' ? (
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-8 rounded-full bg-white/[0.07] border border-white/10 animate-soft-pulse ${staggerClass(i)} ${
                ['w-20', 'w-28', 'w-16', 'w-24', 'w-20', 'w-32'][i % 6]
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={`block rounded-xl bg-white/[0.07] animate-soft-pulse ${staggerClass(i)} ${
                shape === 'cards' ? 'h-12 w-full' : `h-3 ${['w-full', 'w-11/12', 'w-2/3', 'w-5/6', 'w-3/4'][i % 5]}`
              }`}
            />
          ))}
        </div>
      )}
      <p className="text-[var(--color-violet-300)]/70 text-xs text-center">{label}</p>
    </div>
  )
}
