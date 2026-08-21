/**
 * ISO 8601 week string (e.g. "2026-W34") for a given date — used as the
 * `WEEKLYRECAP#<isoWeek>` sort-key suffix (`Sk.weeklyRecap`,
 * MVP_ARCHITECTURE.md §3.1). ISO weeks start Monday and the year is the one
 * containing that week's Thursday, which is why this isn't just
 * `date.getFullYear()` — a late-December/early-January date can belong to a
 * week numbered in the adjacent year.
 */
export function isoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7 // Sunday (0) -> 7, so Monday is 1
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // move to this week's Thursday
  const isoYearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((d.getTime() - isoYearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}
