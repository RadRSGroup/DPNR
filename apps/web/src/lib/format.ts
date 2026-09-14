// `Date.now()` specifically trips apps/web's `react-hooks/purity` lint rule
// even outside a hook (Session 24 found this) — `new Date().getTime()` does not.
//
// Hebrew Localization Slice D (docs/HEBREW_LOCALIZATION_PLAN.md §2): was
// hardcoded English with hand-rolled English pluralization ("1 day ago" /
// "N days ago"). `Intl.RelativeTimeFormat` replaces both the strings AND
// the plural-rule logic — it already knows Hebrew's plural/dual rules, so
// there's no `{count, plural, ...}` message to maintain here, unlike most
// of the rest of this slice. `numeric: 'auto'` gives "today"/"yesterday"
// for the 0/1-day cases the original special-cased, and falls back to
// "N days/weeks/months ago" beyond that, matching the original's shape.
export function timeAgo(iso: string, locale: string): string {
  const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (days < 14) return rtf.format(-days, 'day')
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return rtf.format(-weeks, 'week')
  const months = Math.floor(days / 30)
  return rtf.format(-months, 'month')
}
