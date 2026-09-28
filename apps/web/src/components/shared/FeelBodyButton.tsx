'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PersonStanding } from 'lucide-react'
import FeelBodyOverlay from './FeelBodyOverlay'

/** The Feel / Body entry (#36): a pill next to Check-In, or a round icon in Main Chat's mobile utility row. */
export default function FeelBodyButton({ variant = 'pill', className = '' }: { variant?: 'pill' | 'icon'; className?: string }) {
  const t = useTranslations('FeelBody')
  const [open, setOpen] = useState(false)
  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          className={`w-9 h-9 flex items-center justify-center liquid-glass rounded-full text-white/80 active:scale-[0.96] ${className}`}
          aria-label={t('open')}
        >
          <PersonStanding className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`liquid-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80 ${className}`}
        >
          <PersonStanding className="w-4 h-4 text-[var(--color-amber-400)]" /> {t('open')}
        </button>
      )}
      {open && <FeelBodyOverlay onClose={() => setOpen(false)} />}
    </>
  )
}
