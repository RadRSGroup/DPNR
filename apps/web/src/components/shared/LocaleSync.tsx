'use client'
import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { getCurrentSession } from '@/lib/cognito/client'
import { getPreferences, updatePreferences } from '@/lib/api/v1-client'

const SYNCED_KEY = 'dpnr_locale_synced'

/**
 * Keeps the stored `preferredLanguage` equal to the language on screen.
 *
 * AI-written text (a topic's "For You" explanation, the Companion, room
 * reflections, Daily Card) follows the stored preference, while the UI
 * follows the URL / NEXT_LOCALE cookie. The two can drift: a new device or
 * domain (app.be-dpnr.com has no cookie yet) opens in English for someone
 * whose stored preference is Hebrew, or a LanguageSelector write fails
 * silently. The founder saw exactly that mix (Living Feedback Log,
 * 2026-09-29: "English mode = English throughout"). The displayed
 * language wins, since that is what the person chose or is reading.
 *
 * Checked once per tab per locale (sessionStorage), so ordinary navigation
 * costs no extra request. Best effort: failures are ignored, like
 * LanguageSelector's own write.
 */
export default function LocaleSync() {
  const locale = useLocale() as 'en' | 'he'

  useEffect(() => {
    let cancelled = false
    try {
      if (sessionStorage.getItem(SYNCED_KEY) === locale) return
    } catch {
      // Storage unavailable (private mode): check anyway, it's one GET.
    }
    ;(async () => {
      const session = await getCurrentSession().catch(() => null)
      if (!session || cancelled) return
      const prefs = await getPreferences()
      if (cancelled) return
      if (prefs.preferredLanguage !== locale) await updatePreferences({ preferredLanguage: locale })
      try { sessionStorage.setItem(SYNCED_KEY, locale) } catch {}
    })().catch(() => {})
    return () => { cancelled = true }
  }, [locale])

  return null
}
