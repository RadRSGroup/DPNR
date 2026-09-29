import { getPreferences } from '@/lib/api/v1-client'

/**
 * The language saved on the person's profile, read right after sign-in so
 * the app opens in it. Navigating into that locale with next-intl's router
 * also writes the `NEXT_LOCALE` cookie for this domain, which is what a new
 * device or domain (app.be-dpnr.com) otherwise lacks: next-intl only sets
 * the cookie on a switch, or when the URL's language differs from the
 * browser's Accept-Language.
 *
 * Must run before any `(app)` page mounts LocaleSync, which treats the
 * on-screen language as the source of truth and would otherwise overwrite
 * the saved preference with whatever the browser defaulted to. The sign-in
 * pages sit outside `(app)`, so it does.
 *
 * Best effort: any failure keeps the current locale.
 */
export async function savedLocale(current: 'en' | 'he'): Promise<'en' | 'he'> {
  try {
    return (await getPreferences()).preferredLanguage
  } catch {
    return current
  }
}
