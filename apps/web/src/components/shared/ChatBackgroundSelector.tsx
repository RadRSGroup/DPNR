'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Upload } from 'lucide-react'
import type { ChatBackground } from '@dpnr/shared-types'
import { uploadChatBackground, ApiError } from '@/lib/api/v1-client'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Main Chat's background picker (Account → Preferences).
 *
 * Options: a plain Default, the person's own uploaded image (stored as
 * `chatBackground: 'custom'` + `chatBackgroundKey`), and "Upload a photo".
 *
 * Session 76 (the user's decision): "Create my Vision" was removed from the
 * picker — back to picture upload only. Its backend
 * (`POST /v1/user/chat-background/vision`, `vision-worker.ts`) is still
 * deployed but nothing calls it; see `docs/VISION_SPIKE.md`. A Vision
 * generated earlier is just a custom image and still shows as "My image".
 *
 * `digital_twin`/`environment` are still valid stored values (existing
 * accounts, the schema default) — both simply mean "Default".
 */
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

  const isDefault = value !== 'custom' || !customUrl

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

  const tileBase = 'relative aspect-video rounded-xl overflow-hidden border-2 transition-all'
  const selected = 'border-[var(--color-violet-500)]/80'
  const unselected = 'border-white/10 hover:border-white/25'
  const label =
    'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1.5 text-[11px] font-medium text-white text-start'

  return (
    <div className={className}>
      <div role="radiogroup" aria-label={t('chatBackground')} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          type="button"
          role="radio"
          aria-checked={isDefault}
          onClick={() => onChange('digital_twin')}
          className={`${tileBase} ${isDefault ? selected : unselected} bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.35)_0%,_var(--color-bg-base)_70%)]`}
        >
          <span className={label}>{t('chatBackgroundDefault')}</span>
        </button>

        {customUrl && (
          <button
            type="button"
            role="radio"
            aria-checked={!isDefault}
            onClick={() => onChange('custom')}
            className={`${tileBase} ${!isDefault ? selected : unselected}`}
          >
            {/* A presigned S3 URL — next/image's remote-pattern allowlist
                doesn't cover this per-account, ever-changing host, same
                reasoning as AvatarUpload.tsx's own <img>. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customUrl} alt="" className="w-full h-full object-cover" />
            <span className={label}>{t('chatBackgroundCustom')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`${tileBase} border-dashed border-white/20 hover:border-white/35 flex flex-col items-center justify-center gap-1 text-white/55 text-[11px] px-2 text-center disabled:opacity-50`}
        >
          <Upload className="w-4 h-4" />
          {uploading ? tAvatar('uploading') : t('chatBackgroundUploadPrompt')}
        </button>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={handleFileChange} className="hidden" />
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
