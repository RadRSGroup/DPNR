'use client'
import { useTranslations } from 'next-intl'
import { useTimeToday } from '@/lib/time-on-dpnr'

function minutes(seconds: number) {
  return Math.floor(seconds / 60)
}

/**
 * "12 min today" (Session 70, feedback log "Time on DPNR"): awareness only.
 * Quiet text, no goal, no progress ring, no warning at any length. The
 * active/ambient split is in the tooltip. Counted on this device only
 * (lib/time-on-dpnr.ts).
 */
export default function TimeTodayIndicator({ className = '' }: { className?: string }) {
  const t = useTranslations('Companion.timeToday')
  const today = useTimeToday()
  if (!today) return null
  const total = minutes(today.activeSeconds + today.ambientSeconds)
  const h = Math.floor(total / 60)
  const label = total < 1 ? t('underAMinute') : h > 0 ? t('hoursMinutes', { hours: h, minutes: total % 60 }) : t('minutes', { minutes: total })
  return (
    <p
      className={`text-xs text-white/50 ${className}`}
      title={t('breakdown', { active: minutes(today.activeSeconds), ambient: minutes(today.ambientSeconds) })}
    >
      {label}
    </p>
  )
}
