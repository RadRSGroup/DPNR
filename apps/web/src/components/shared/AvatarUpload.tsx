'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { uploadAvatar, ApiError } from '@/lib/api/v1-client'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/**
 * Session 51 — the photo half of the post-signin profile-setup screen,
 * also reused on the Account settings page so a photo can be changed
 * later. Handles the full picker→upload→attach round-trip itself
 * (`uploadAvatar()`, `lib/api/v1-client.ts`) — callers just get the
 * resulting presigned `avatarUrl` back to render.
 */
export default function AvatarUpload({
  avatarUrl,
  onUploaded,
  className,
}: {
  avatarUrl: string | null
  onUploaded: (avatarUrl: string | null) => void
  className?: string
}) {
  const t = useTranslations('Auth.avatar')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('errorFileType'))
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(t('errorFileSize'))
      return
    }

    setError(null)
    setUploading(true)
    try {
      const newAvatarUrl = await uploadAvatar(file)
      onUploaded(newAvatarUrl)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errorGeneric'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center disabled:opacity-50"
      >
        {avatarUrl ? (
          // A presigned S3 URL — next/image's remote-pattern allowlist
          // doesn't cover this per-account, ever-changing host, so a plain
          // <img> is the right tool here, not next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/30 text-2xl">👤</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs">{t('uploading')}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-purple-400 hover:text-purple-300 text-xs disabled:opacity-50"
      >
        {avatarUrl ? t('changePhoto') : t('addPhoto')}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  )
}
