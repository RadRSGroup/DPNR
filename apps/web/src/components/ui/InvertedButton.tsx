interface InvertedButtonProps {
  label: string
  onClick?: () => void
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        rounded-full bg-white/90 hover:bg-white active:scale-[0.98]
        text-[#1a0826] text-sm font-semibold transition-all
        disabled:opacity-40 disabled:pointer-events-none
        ${className}
      `}
    >
      {label}
    </button>
  )
}
