'use client'
import { useTranslations } from 'next-intl'
import { usePendingClick, SPINNER_PATH } from './usePendingClick'

interface PrimaryButtonProps {
  label: string
  /** Return a promise (e.g. a step submit) to get a pending spinner until it settles. */
  onClick?: () => unknown
  disabled?: boolean
  loading?: boolean
  className?: string
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d={SPINNER_PATH}/>
    </svg>
  )
}

export default function PrimaryButton({ label, onClick, disabled, loading, className = '' }: PrimaryButtonProps) {
  const t = useTranslations('Shared')
  const { pending, handleClick } = usePendingClick(onClick)
  // `pending` keeps the violet fill (the tap registered); `disabled`/`loading` grey it out.
  const inactive = disabled || loading
  return (
    <button
      onClick={handleClick}
      disabled={inactive || pending}
      aria-busy={pending || loading || undefined}
      className={`
        w-full py-4 rounded-2xl font-medium text-base transition-all
        ${inactive
          ? 'bg-white/10 text-[var(--color-text-tertiary)] cursor-not-allowed'
          : pending
            ? 'bg-purple-600/80 text-white/90 cursor-wait shadow-lg shadow-purple-900/30'
            : 'bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white shadow-lg shadow-purple-900/30'
        }
        ${className}
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {t('thinking')}
        </span>
      ) : pending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {label}
        </span>
      ) : label}
    </button>
  )
}
