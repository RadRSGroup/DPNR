'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Headphones, MessageCircle, Mail } from 'lucide-react'

const SUPPORT_EMAIL = 'support@dpnr.app' // same address the Terms page already publishes

/**
 * The sidebar's "Need help?" control — previously a static, non-interactive
 * label. Opens a small menu upward (it sits at the bottom of the sidebar):
 * talk it through with the Companion, or email support. It always shows the
 * same general crisis line the safety prompts use — deliberately no named
 * hotline or number, because none is configured for this product yet
 * (`infra/cdk/scripts/safety-prompts.seed.ts`), and someone reaching for
 * "Need help?" may be in distress, not stuck on a feature.
 */
export default function HelpMenu() {
  const t = useTranslations('Nav')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative mt-auto pt-4">
      {open && (
        <div
          role="menu"
          className="liquid-glass absolute bottom-full mb-2 start-0 end-0 rounded-[var(--radius-card)] p-3 space-y-1 z-20"
        >
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide px-2 pb-1">{t('helpMenu.title')}</p>
          <Link
            href="/companion"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5"
          >
            <MessageCircle className="w-4 h-4 mt-0.5 text-[var(--color-violet-300)] shrink-0" />
            <span>
              <span className="block text-sm text-white/85">{t('helpMenu.companion')}</span>
              <span className="block text-xs text-[var(--color-text-tertiary)]">{t('helpMenu.companionHint')}</span>
            </span>
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5"
          >
            <Mail className="w-4 h-4 mt-0.5 text-[var(--color-violet-300)] shrink-0" />
            <span>
              <span className="block text-sm text-white/85">{t('helpMenu.email')}</span>
              <span className="block text-xs text-[var(--color-text-tertiary)]" dir="ltr">{SUPPORT_EMAIL}</span>
            </span>
          </a>
          <p className="text-xs text-white/55 leading-snug px-2 pt-2 border-t border-white/10">{t('helpMenu.crisis')}</p>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/5 text-sm text-start transition-colors"
      >
        <Headphones className="w-[18px] h-[18px]" />
        <div>
          <div>{t('needHelp')}</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{t('needHelpSubtitle')}</div>
        </div>
      </button>
    </div>
  )
}
