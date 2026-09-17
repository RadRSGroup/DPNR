'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { ChatBackground } from '@dpnr/shared-types'

/**
 * Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1/§4 Slice A) —
 * two curated presets, both real finished designs per the reference
 * mockups, not a "pick one, defer the other" choice. `custom` (upload your
 * own photo) isn't offered here yet — no upload endpoint exists (a
 * separate, larger piece of Slice A). Visual thumbnails rather than
 * `GenderSelector`'s plain text buttons, since this is inherently a
 * visual choice.
 */
const OPTIONS: { value: ChatBackground; src: string }[] = [
  { value: 'digital_twin', src: '/images/backgrounds/companion-bg.webp' },
  { value: 'environment', src: '/images/backgrounds/companion-bg-environment.webp' },
]

export default function ChatBackgroundSelector({
  value,
  onChange,
  className,
}: {
  value: ChatBackground
  onChange: (next: ChatBackground) => void
  className?: string
}) {
  const t = useTranslations('Account.preferences')
  return (
    <div role="radiogroup" aria-label={t('chatBackground')} className={`flex gap-3 ${className ?? ''}`}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
            value === opt.value
              ? 'border-[var(--color-violet-500)]/80'
              : 'border-white/10 hover:border-white/25'
          }`}
        >
          <Image src={opt.src} alt="" fill className="object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-[11px] font-medium text-white text-start">
            {t(opt.value === 'digital_twin' ? 'chatBackgroundDigitalTwin' : 'chatBackgroundEnvironment')}
          </span>
        </button>
      ))}
    </div>
  )
}
