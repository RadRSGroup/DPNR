'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getCurrentSession } from '@/lib/cognito/client'
import { updatePreferences } from '@/lib/api/v1-client'

/**
 * docs/HEBREW_LOCALIZATION_PLAN.md Slice B. Native language names, not
 * translated ("English"/"עברית") — the point is to be findable by someone
 * who can't yet read the current locale's UI, a standard convention for
 * language pickers.
 *
 * Switching locale always re-routes via next-intl's own `router.replace`
 * (which also sets the `NEXT_LOCALE` cookie itself — no manual cookie code
 * needed, covers guests automatically). For a signed-in user this ALSO
 * fires a best-effort `PUT /v1/user/preferences` to persist the choice
 * server-side; a failed persist is swallowed rather than surfaced, since
 * the visible switch already happened and Slice E's eventual AI-content
 * locale resolution treats the DB value as one of several inputs, not the
 * only one — a stale profile write here isn't a user-facing failure worth
 * an error state for.
 */
export default function LanguageSelector({ className }: { className?: string }) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  async function switchTo(next: 'en' | 'he') {
    if (next === locale) return
    router.replace(pathname, { locale: next })

    const session = await getCurrentSession().catch(() => null)
    if (!session) return // guest — the cookie next-intl just set is the whole story
    updatePreferences({ preferredLanguage: next }).catch(() => {})
  }

  return (
    <div
      role="group"
      aria-label={t('languageAriaLabel')}
      className={`inline-flex items-center gap-1 rounded-full border border-[var(--color-border-glass)] bg-white/5 p-0.5 text-xs ${className ?? ''}`}
    >
      <button
        type="button"
        onClick={() => switchTo('en')}
        aria-pressed={locale === 'en'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          locale === 'en' ? 'bg-[var(--color-violet-600)] text-white' : 'text-white/60 hover:text-white'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => switchTo('he')}
        aria-pressed={locale === 'he'}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          locale === 'he' ? 'bg-[var(--color-violet-600)] text-white' : 'text-white/60 hover:text-white'
        }`}
      >
        עברית
      </button>
    </div>
  )
}
