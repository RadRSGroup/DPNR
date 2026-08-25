interface ProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  colorClassName?: string
  trackClassName?: string
  children?: React.ReactNode
}

export default function ProgressRing({
  percent,
  size = 88,
  strokeWidth = 8,
  colorClassName = 'stroke-[var(--color-violet-500)]',
  trackClassName = 'stroke-white/10',
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className={trackClassName} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={colorClassName}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
