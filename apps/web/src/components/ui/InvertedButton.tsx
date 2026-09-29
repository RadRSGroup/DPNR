'use client'
import { usePendingClick, SPINNER_PATH } from './usePendingClick'

interface InvertedButtonProps {
  label: string
  /** Return a promise (e.g. the closing submit) to get a pending spinner until it settles. */
  onClick?: () => unknown
  disabled?: boolean
  className?: string
}

/**
 * The white-pill / dark-text button used on every "closing" screen
 * (Completion, Commitment, Celebration, Clarity-to-Action, Summary-Insight,
 * both rooms) — previously hand-duplicated as an identical literal
 * className string across 7 files (theme audit, docs/AGENT_LOG.md). Same
 * prop shape as `PrimaryButton`, inverted palette: this is deliberately a
 * second button style, not a `PrimaryButton` variant — the closing screens'
 * white pill is a distinct visual beat from the mid-flow violet CTA.
 */
export default function InvertedButton({ label, onClick, disabled, className = '' }: InvertedButtonProps) {
  const { pending, handleClick } = usePendingClick(onClick)
  return (
    <button
      onClick={handleClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`
        rounded-full bg-white/90 hover:bg-white active:scale-[0.98]
        text-[#1a0826] text-sm font-semibold transition-all
        disabled:pointer-events-none
        ${pending ? 'cursor-wait' : 'disabled:opacity-40'}
        ${className}
      `}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d={SPINNER_PATH}/>
          </svg>
          {label}
        </span>
      ) : label}
    </button>
  )
}
