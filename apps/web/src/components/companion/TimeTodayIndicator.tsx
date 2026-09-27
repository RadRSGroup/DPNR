'use client'
import { useTranslations } from 'next-intl'
import { useTimeToday } from '@/lib/time-on-dpnr'
import InfoPopover from '@/components/ui/InfoPopover'

function minutes(seconds: number) {
  return Math.floor(seconds / 60)
}

/**
 * "12 min today" (Session 70, feedback log "Time on DPNR"): awareness only.
 * Quiet text, no goal, no progress ring, no warning at any length. The
 * active/ambient split opens on tap/click/hover (it was a hover-only
 * tooltip until 2026-09-27). Counted on this device only
 * (lib/time-on-dpnr.ts).
 */
export default function TimeTodayIndicator({ className = '' }: { className?: string }) {
  const t = useTranslations('Companion.timeToday')
  const today = useTimeToday()
  if (!today) return null
  const total = minutes(today.activeSeconds + today.ambientSeconds)
  const h = Math.floor(total / 60)
  const label = total < 1 ? t('underAMinute') : h > 0 ? t('hoursMinutes', { hours: h, minutes: total % 60 }) : t('minutes', { minutes: total })
  const breakdown = t('breakdown', { active: minutes(today.activeSeconds), ambient: minutes(today.ambientSeconds) })
  return (
    <InfoPopover
      label={`${label}. ${breakdown}`}
      content={breakdown}
      className={`text-xs text-white/50 hover:text-white/70 transition-colors ${className}`}
    >
      {label}
    </InfoPopover>
  )
}
