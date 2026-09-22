'use client'
import { useTranslations } from 'next-intl'
import { Music, Play, SlidersHorizontal } from 'lucide-react'
import Card from '@/components/ui/Card'

/**
 * Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.4) — an honest
 * "coming soon" stub, same pattern Wallet's checkout already uses. No
 * audio content or player exists anywhere in this codebase; the reference
 * mockups (docs/CHAT UX.png / docs/CHAT UX 2.png) show a specific real-
 * looking track, but building real playback needs actual audio content
 * this widget doesn't have yet. The play button is disabled rather than
 * silently doing nothing, so it doesn't read as broken.
 */
export default function FocusMode() {
  const t = useTranslations('Companion.focusMode')
  return (
    <Card className="!p-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-[var(--color-violet-600)]/20 flex items-center justify-center">
          <Music className="w-5 h-5 text-[var(--color-violet-300)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/85">{t('title')}</p>
          <p className="text-xs text-[var(--color-text-tertiary)] truncate">{t('subtitle')}</p>
        </div>
        <button
          disabled
          title={t('comingSoon')}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/40 cursor-not-allowed"
          aria-label={t('playLabel')}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
        <button
          disabled
          title={t('comingSoon')}
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-white/30 cursor-not-allowed"
          aria-label={t('settingsLabel')}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}
