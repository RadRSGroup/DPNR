interface PrimaryButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export default function PrimaryButton({ label, onClick, disabled, loading, className = '' }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full py-4 rounded-2xl font-medium text-base transition-all duration-150
        ${disabled || loading
          ? 'bg-white/10 text-white/30 cursor-not-allowed'
          : 'bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white shadow-lg shadow-purple-900/30'
        }
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Thinking...
        </span>
      ) : label}
    </button>
  )
}
