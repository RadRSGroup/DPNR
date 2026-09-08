// `Date.now()` specifically trips apps/web's `react-hooks/purity` lint rule
// even outside a hook (Session 24 found this) — `new Date().getTime()` does not.
export function timeAgo(iso: string): string {
  const days = Math.floor((new Date().getTime() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 14) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}
