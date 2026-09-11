import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export default function Card({ glow = false, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`
        liquid-glass rounded-[var(--radius-card)] p-4
        ${glow ? 'shadow-[var(--shadow-glow-violet)]' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  )
}
