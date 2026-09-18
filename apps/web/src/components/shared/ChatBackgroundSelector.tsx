'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { ChatBackground } from '@dpnr/shared-types'
import { uploadChatBackground, ApiError } from '@/lib/api/v1-client'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1/§4 Slice A) —
 * two curated presets, both real finished designs per the reference
 * mockups, not a "pick one, defer the other" choice, plus a third `custom`
 * tile (a user's own uploaded photo) — the piece originally deferred for
 * needing its own S3 prefix/Lambda (`docs/AGENT_LOG.md`). Visual
 * thumbnails rather than `GenderSelector`'s plain text buttons, since this
 * is inherently a visual choice.
 *
 * The custom tile owns its own upload flow (file picker → validate →
 * `uploadChatBackground()`, same picker/validate/upload/attach shape as
 * `AvatarUpload.tsx`) rather than going through `onChange`, since a
 * successful upload already persists `chatBackground: 'custom'` +
 * `chatBackgroundKey` in the same `PUT /v1/user/preferences` call
 * (`uploadChatBackground`'s own doc comment) — routing it through
 * `onChange` too would fire a second, redundant write. `onChange` is only
 * for switching between options that already have something to point at
 * (a preset, or a custom photo already uploaded in a prior visit).
 */
const PRESET_OPTIONS: { value: ChatBackground; src: string }[] = [
  { value: 'digital_twin', src: '/images/backgrounds/companion-bg.webp' },
  { value: 'environment', src: '/images/backgrounds/companion-bg-environment.webp' },
]

export default function ChatBackgroundSelector({
  value,
  onChange,
  customUrl,
  onCustomUploaded,
  className,
}: {
  value: ChatBackground
  onChange: (next: ChatBackground) => void
  customUrl: string | null
  onCustomUploaded: (url: string) => void
  className?: string
}) {
  const t = useTranslations('Account.preferences')
  const tAvatar = useTranslations('Auth.avatar')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(tAvatar('errorFileType'))
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(tAvatar('errorFileSize'))
      return
    }

    setError(null)
    setUploading(true)
    try {
      const newUrl = await uploadChatBackground(file)
      if (newUrl) onCustomUploaded(newUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tAvatar('errorGeneric'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={className}>
      <div role="radiogroup" aria-label={t('chatBackground')} className="flex gap-3">
        {PRESET_OPTIONS.map((opt) => (
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

        {customUrl ? (
          <button
            type="button"
            role="radio"
            aria-checked={value === 'custom'}
            onClick={() => onChange('custom')}
            className={`flex-1 relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
              value === 'custom'
                ? 'border-[var(--color-violet-500)]/80'
                : 'border-white/10 hover:border-white/25'
            }`}
          >
            {/* A presigned S3 URL — next/image's remote-pattern allowlist
                doesn't cover this per-account, ever-changing host, same
                reasoning as AvatarUpload.tsx's own <img>. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customUrl} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-[11px] font-medium text-white text-start">
              {t('chatBackgroundCustom')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex-1 relative aspect-video rounded-xl border-2 border-dashed border-white/20 hover:border-white/35 flex items-center justify-center text-center px-2 text-white/50 text-[11px] disabled:opacity-50"
          >
            {uploading ? tAvatar('uploading') : t('chatBackgroundUploadPrompt')}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
