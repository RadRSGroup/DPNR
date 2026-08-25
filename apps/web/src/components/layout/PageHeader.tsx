interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pt-6 pb-4 lg:pt-2">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl text-white">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
