import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export default function Card({ glow = false, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`
        rounded-[var(--radius-card)] border border-[var(--color-border-glass)]
        bg-[var(--color-surface-glass)] p-4
        ${glow ? 'shadow-[var(--shadow-glow-violet)]' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  )
}
