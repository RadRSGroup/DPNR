'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { PencilLine } from 'lucide-react'
import type { FlowId } from '@dpnr/shared-types'
import { submitRoomCommand, ApiError } from '@/lib/api/v1-client'

/**
 * "Edit answers" on a finished Decision/Mirror review page (Session 67).
 * Pick the step to redo from → confirm → `REOPEN` puts the session back in
 * progress at that step (rooms/command.ts `reopenSession`) → the normal
 * room page resumes it (`?resume=`) with every earlier answer pre-filled.
 * Finishing again regenerates the summary and suggested insights from the
 * edited answers; insights already confirmed are kept (rooms/reopen.ts).
 */
export default function ReopenPanel({
  flowId,
  sessionId,
  sessionVersion,
  steps,
  resumeHref,
}: {
  flowId: FlowId
  sessionId: string
  sessionVersion: number
  steps: { id: string; label: string }[]
  resumeHref: string
}) {
  const t = useTranslations('RoomsReopen')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [stepId, setStepId] = useState(steps[0]?.id ?? '')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReopen() {
    if (!stepId || working) return
    setWorking(true)
    setError(null)
    try {
      await submitRoomCommand({
        flowId,
        sessionId,
        stepId,
        action: 'REOPEN',
        expectedSessionVersion: sessionVersion,
        idempotencyKey: crypto.randomUUID(),
        input: {},
      })
      router.push(resumeHref)
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'session_version_conflict' ? t('conflict') : t('failed'))
      setWorking(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-violet-300)] hover:text-[var(--color-violet-200)]"
      >
        <PencilLine className="w-3.5 h-3.5" /> {t('editAnswers')}
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-violet-500)]/30 bg-[var(--color-violet-900)]/15 p-4 space-y-3">
      <p className="text-white/90 text-sm font-medium">{t('title')}</p>
      <label className="block">
        <span className="block text-xs text-[var(--color-text-tertiary)] mb-1">{t('redoFrom')}</span>
        <select
          value={stepId}
          onChange={(e) => setStepId(e.target.value)}
          disabled={working}
          className="w-full bg-[var(--color-surface-glass)] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-violet-500)]/60"
        >
          {steps.map((s) => (
            <option key={s.id} value={s.id} className="bg-[var(--color-bg-base)]">
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-white/60 leading-relaxed">{t('explain')}</p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleReopen}
          disabled={working}
          className="text-sm px-4 py-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white disabled:opacity-50"
        >
          {working ? t('reopening') : t('confirm')}
        </button>
        <button onClick={() => setOpen(false)} disabled={working} className="text-sm text-white/60 hover:text-white/80 px-2">
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}
