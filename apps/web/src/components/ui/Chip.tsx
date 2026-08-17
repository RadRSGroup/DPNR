'use client'

interface ChipProps {
  label: string
  selected?: boolean
  onClick?: () => void
  aiSuggested?: boolean
}

export default function Chip({ label, selected, onClick, aiSuggested }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-all duration-150
        ${selected
          ? 'bg-purple-600 border-purple-500 text-white'
          : aiSuggested
          ? 'bg-purple-900/30 border-purple-700/50 text-purple-300 hover:bg-purple-800/40'
          : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {label}
    </button>
  )
}
