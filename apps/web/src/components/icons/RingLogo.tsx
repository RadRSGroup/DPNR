export default function RingLogo({ className = 'w-8 h-8' }: { className?: string }) {
  const gradientId = 'dpnr-ring-gradient'
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-violet-500)" />
          <stop offset="55%" stopColor="var(--color-magenta-500)" />
          <stop offset="100%" stopColor="var(--color-amber-400)" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" stroke={`url(#${gradientId})`} strokeWidth="3" />
    </svg>
  )
}
