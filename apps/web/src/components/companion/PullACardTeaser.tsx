'use client'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { CARD_DEFAULT_IMAGE } from '@/lib/library/topic-images'

/**
 * Main Chat's phone landing entry to Pull a Card (2026-09-28 phone report:
 * the full card sat above the chat and was the first thing seen). One
 * compact glass row, a small glowing card thumbnail and the invitation,
 * that opens the full `PullACard` in the `?card=1` sheet. The card itself
 * (selection, shuffle, deal) is unchanged; this is only the way in.
 */
export default function PullACardTeaser({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations('Companion.pullACard')
  return (
    <button
      onClick={onOpen}
      className="w-full liquid-glass rounded-[var(--radius-card)] flex items-center gap-3 p-2.5 pe-3 text-start active:scale-[0.99] transition-transform"
    >
      <span className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden border border-white/30 shadow-[0_0_14px_rgba(139,92,246,0.45)]">
        <Image src={CARD_DEFAULT_IMAGE} alt="" fill sizes="48px" className="object-cover" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{t('todaysCard')}</span>
        <span className="block text-sm text-white/85 leading-snug">{t('prompt')}</span>
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-white/50 rtl:-scale-x-100" aria-hidden />
    </button>
  )
}
