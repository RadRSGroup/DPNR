'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mountain, Upload } from 'lucide-react'
import type { ChatBackground } from '@dpnr/shared-types'
import { uploadChatBackground, startVision, getVisionStatus, ApiError } from '@/lib/api/v1-client'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 120_000

const VISION_ERROR_CODES = new Set([
  'avatar_required',
  'vision_declined',
  'vision_limit_reached',
  'content_filtered',
  'generation_failed',
  'timeout',
])

/**
 * Main Chat's background picker (Account → Preferences).
 *
 * Session 67 (the user's product decision): the two generic preset images
 * are gone. Options are now a plain Default, the person's own image (an
 * upload, or a generated Vision — both stored as `chatBackground: 'custom'`
 * + `chatBackgroundKey`), "Create my Vision", and "Upload a photo".
 *
 * A Vision places the person's own profile photo inside a scene they
 * describe (their goal state, or anything they like) — generated
 * server-side (`POST /v1/user/chat-background/vision`), async, so this
 * polls the job until it finishes. The server makes the result the chat
 * background itself; `onCustomUploaded` only reflects that locally. Limited
 * to a few free generations a month (`visionRemaining`), refunded on any
 * failure.
 *
 * `digital_twin`/`environment` are still valid stored values (existing
 * accounts, the schema default) — both now simply mean "Default".
 */
export default function ChatBackgroundSelector({
  value,
  onChange,
  customUrl,
  onCustomUploaded,
  hasAvatar,
  visionRemaining,
  onVisionRemainingChange,
  roadmapDirection,
  className,
}: {
  value: ChatBackground
  onChange: (next: ChatBackground) => void
  customUrl: string | null
  onCustomUploaded: (url: string) => void
  hasAvatar: boolean
  visionRemaining: number
  onVisionRemainingChange: (remaining: number) => void
  roadmapDirection: string | null
  className?: string
}) {
  const t = useTranslations('Account.preferences')
  const tv = useTranslations('Account.preferences.vision')
  const tAvatar = useTranslations('Auth.avatar')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visionOpen, setVisionOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [visionError, setVisionError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const isDefault = value !== 'custom' || !customUrl
  const generating = starting || jobId !== null

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    const startedAt = Date.now()
    let timer: ReturnType<typeof setTimeout>

    async function poll() {
      if (cancelled || !jobId) return
      try {
        const status = await getVisionStatus(jobId)
        if (cancelled) return
        if (status.status === 'done' && status.imageUrl) {
          onCustomUploaded(status.imageUrl)
          setJobId(null)
          setVisionOpen(false)
          setPrompt('')
          return
        }
        if (status.status === 'failed') {
          setVisionError(status.errorCode ?? 'generation_failed')
          // The worker refunds a failed generation — mirror that locally. The
          // effect started after the start response set the decremented count.
          onVisionRemainingChange(visionRemaining + 1)
          setJobId(null)
          return
        }
      } catch {
        // transient — keep polling until the timeout below
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setVisionError('timeout')
        setJobId(null)
        return
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }
    timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll loop is keyed on the job only
  }, [jobId])

  async function handleGenerate() {
    const text = prompt.trim()
    if (text.length < 3 || generating) return
    setVisionError(null)
    setStarting(true)
    try {
      const res = await startVision({ prompt: text })
      onVisionRemainingChange(res.remainingThisMonth)
      setJobId(res.jobId)
    } catch (err) {
      setVisionError(err instanceof ApiError && VISION_ERROR_CODES.has(err.code) ? err.code : 'generation_failed')
    } finally {
      setStarting(false)
    }
  }

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
      <div role="radiogroup" aria-label={t('chatBackground')} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          onClick={() => {
            setVisionOpen(true)
            setVisionError(null)
          }}
          aria-expanded={visionOpen}
          className={`${tileBase} border-dashed border-[var(--color-violet-500)]/50 hover:border-[var(--color-violet-400)] flex flex-col items-center justify-center gap-1 text-[var(--color-violet-200)] text-[11px] px-2 text-center`}
        >
          <Mountain className="w-5 h-5" />
          {tv('create')}
        </button>

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

      {visionOpen && (
        <div className="mt-4 rounded-xl border border-[var(--color-violet-500)]/30 bg-[var(--color-violet-900)]/15 p-4 space-y-3">
          <div>
            <p className="text-white/90 text-sm font-medium">{tv('title')}</p>
            <p className="text-[var(--color-text-tertiary)] text-xs mt-1">{tv('intro')}</p>
          </div>

          {!hasAvatar ? (
            <p className="text-amber-200/90 text-xs">{tv('needsPhoto')}</p>
          ) : (
            <>
              {roadmapDirection && !prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt(tv('roadmapPrefix', { direction: roadmapDirection }) + ' ')}
                  className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80"
                >
                  {tv('useRoadmap')}
                </button>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={400}
                rows={3}
                disabled={generating}
                placeholder={tv('placeholder')}
                className="w-full bg-[var(--color-surface-glass)] border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-[var(--color-text-tertiary)] resize-none focus:outline-none focus:border-[var(--color-violet-500)]/60 disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || prompt.trim().length < 3 || visionRemaining === 0}
                  className="text-sm px-4 py-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white disabled:bg-white/10 disabled:text-white/40"
                >
                  {tv('generate')}
                </button>
                <button
                  type="button"
                  onClick={() => setVisionOpen(false)}
                  disabled={generating}
                  className="text-sm text-white/60 hover:text-white/80 disabled:opacity-40"
                >
                  {tv('cancel')}
                </button>
                <span className="text-xs text-[var(--color-text-tertiary)]">{tv('remaining', { count: visionRemaining })}</span>
              </div>
              {generating && <p className="text-xs text-[var(--color-violet-200)] animate-soft-pulse">{tv('generating')}</p>}
              <p className="text-[11px] text-[var(--color-text-tertiary)]">{tv('privacy')}</p>
            </>
          )}
          {visionError && <p className="text-xs text-red-300">{tv(`errors.${visionError}`)}</p>}
        </div>
      )}
    </div>
  )
}
