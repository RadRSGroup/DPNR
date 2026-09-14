import { defineRouting } from 'next-intl/routing'

/**
 * Single source of truth for supported locales — deliberately re-exports
 * the same set already declared in `@dpnr/shared-types`'
 * `UserProfileItemSchema.preferredLanguage` enum, so the two never drift.
 * `localePrefix: 'as-needed'` keeps every existing English URL unprefixed
 * (`/dashboard`, `/companion`, ...) and only adds a prefix for Hebrew
 * (`/he/dashboard`) — see docs/HEBREW_LOCALIZATION_PLAN.md §3 for why this
 * was chosen over prefixing both locales.
 */
export const routing = defineRouting({
  locales: ['en', 'he'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type AppLocale = (typeof routing.locales)[number]
