import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware drop-in replacements for `next/link`'s `Link` and
 * `next/navigation`'s `useRouter`/`usePathname`/`redirect` — every internal
 * navigation call in the app must import from here instead of `next/link`/
 * `next/navigation`, or it silently drops the `/he` prefix on click
 * (see docs/HEBREW_LOCALIZATION_PLAN.md's navigation note). `useParams`,
 * `useSearchParams`, and `notFound` are unaffected by locale and still come
 * from `next/navigation` directly.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
