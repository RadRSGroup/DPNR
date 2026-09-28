import type { DecisionOption } from '@/lib/types'

/**
 * One heading system for the Decision Room (founder feedback 2026-09-28 #10,
 * #12, #14): a small warm-gold eyebrow that names the layer you're in, a
 * display-font heading, and optional supporting text. Every lens, the Future
 * Projection prompts and the summary sections use it, so moving into a new
 * layer is visible at a glance without adding colours.
 */
export function RoomHeading({
  eyebrow,
  title,
  children,
  align = 'center',
  as: Tag = 'h3',
}: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
  align?: 'center' | 'start'
  as?: 'h2' | 'h3' | 'h4'
}) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-start'}>
      {eyebrow && <p className="text-[var(--color-amber-300)] text-[11px] lg:text-xs uppercase tracking-[0.2em]">{eyebrow}</p>}
      <Tag className="font-display text-white text-xl lg:text-2xl leading-snug mt-1.5">{title}</Tag>
      {children && <p className="text-white/70 text-sm lg:text-base leading-relaxed mt-2 max-w-prose mx-auto">{children}</p>}
    </div>
  )
}

/**
 * The two options, always in view while you evaluate them (#8): labelled
 * "Option A" / "Option B" with the person's own wording, the one being
 * evaluated now highlighted, so nobody has to remember what A and B meant.
 */
export function OptionContext({
  optionA,
  optionB,
  active,
}: {
  optionA: DecisionOption
  optionB: DecisionOption
  active?: 'A' | 'B'
}) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:gap-3">
      {[optionA, optionB].map((opt) => {
        const isActive = active === undefined || active === opt.label
        return (
          <div
            key={opt.label}
            aria-current={active === opt.label ? 'true' : undefined}
            className={`rounded-2xl border p-3 lg:p-4 transition-all duration-(--motion-calm) ${
              active === opt.label
                ? 'border-[var(--color-amber-300)]/50 bg-white/[0.07] shadow-[0_0_18px_rgba(245,185,66,0.12)]'
                : 'border-white/12 bg-white/[0.04]'
            } ${isActive ? '' : 'opacity-50'}`}
          >
            <p className="text-[var(--color-amber-300)] text-[11px] uppercase tracking-[0.18em]">Option {opt.label}</p>
            <p className="text-white/85 text-sm leading-snug mt-1 line-clamp-3">{opt.content}</p>
          </div>
        )
      })}
    </div>
  )
}
