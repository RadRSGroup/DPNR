'use client'

import { useTranslations } from 'next-intl'
import type { GenderIdentity } from '@dpnr/shared-types'

/**
 * docs/HEBREW_LOCALIZATION_PLAN.md §10/Slice B — collected purely to pick
 * correct Hebrew grammatical gender in future AI-generated responses
 * (Slice E); irrelevant while `preferredLanguage` is `'en'`. Controlled,
 * not self-persisting — signup (`[locale]/signup/page.tsx`) holds this in
 * local state until the account exists to write to, while the Account
 * settings page persists on change immediately. Both reuse this one
 * component rather than duplicating the three-option UI.
 */
const OPTIONS: GenderIdentity[] = ['male', 'female', 'unspecified']

export default function GenderSelector({
  value,
  onChange,
  className,
}: {
  value: GenderIdentity
  onChange: (next: GenderIdentity) => void
  className?: string
}) {
  const t = useTranslations('Auth.gender')
  return (
    <div role="radiogroup" aria-label={t('ariaLabel')} className={`flex gap-2 ${className ?? ''}`}>
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
            value === opt
              ? 'border-[var(--color-violet-500)]/60 bg-[var(--color-violet-900)]/40 text-[var(--color-violet-300)]'
              : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
          }`}
        >
          {t(`options.${opt}`)}
        </button>
      ))}
    </div>
  )
}
