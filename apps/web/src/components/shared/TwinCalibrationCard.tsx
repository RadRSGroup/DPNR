'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { confirmTwinSignal, rejectTwinSignal } from '@/lib/api/v1-client'
import type { TwinSignalDomain, TwinListResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

type Signal = TwinListResponse['signals'][number]

/** How long the acknowledgement stays before the reflection leaves. */
const ACK_MS = 3500

/**
 * Contextual "Confirm / Not quite" calibration card — the spec's prescribed
 * home for Digital Twin correction (`docs/INTELLIGENCE_SPEC_AUDIT.md` §5/§6:
 * "no separate InnerSelf destination for MVP"; §9: calibration "may appear
 * contextually in Dashboard/Main Chat... or longitudinally in Growth
 * Tracker"). Replaces the retired `/twin` page (see that route's own doc
 * comment, `docs/AGENT_LOG.md` Session 29, ADR 0010) for its confirm/reject
 * behavior specifically.
 *
 * Shows only `status === 'candidate'` signals — the ones DPNR is actually
 * waiting on the user to calibrate — capped at `limit`, matching Dashboard's
 * own "orientation, not a database view" convention (spec §15) rather than
 * the old page's full unbounded list of every signal regardless of status.
 * Already-confirmed signals surface elsewhere (Patterns Track, Life
 * Domains, Leading Archetypes); already-rejected ones are deliberately not
 * re-shown here, per spec §9's "stop asserting; do not repeatedly reassert
 * a rejected interpretation."
 *
 * Calibration loop made visible (founder feedback 2026-09-27: "DPNR
 * reflects → I calibrate → DPNR learns"): after Confirm / Not quite the
 * reflection is replaced for a moment by a short acknowledgement, then
 * leaves. No score language. The endpoints and what they do to the signal
 * are unchanged; the optional "Not really / Partly / It's different"
 * follow-up is not built, since storing it would be new persisted data.
 */
export default function TwinCalibrationCard({
  signals,
  onSignalUpdated,
  limit = 3,
}: {
  signals: Signal[]
  onSignalUpdated: (signalId: string, status: Signal['status']) => void
  limit?: number
}) {
  const t = useTranslations('Dashboard.calibration')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const [acks, setAcks] = useState<Record<string, 'confirmed' | 'rejected'>>({})
  const timers = useRef<number[]>([])
  const candidates = signals.filter((s) => s.status === 'candidate').slice(0, limit)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  if (candidates.length === 0) return null

  async function handleAction(signalId: string, action: 'confirm' | 'reject') {
    if (pendingId) return
    setPendingId(signalId)
    setFailedId(null)
    try {
      const res = action === 'confirm' ? await confirmTwinSignal(signalId) : await rejectTwinSignal(signalId)
      setAcks((prev) => ({ ...prev, [signalId]: action === 'confirm' ? 'confirmed' : 'rejected' }))
      timers.current.push(
        window.setTimeout(() => {
          onSignalUpdated(signalId, res.status)
          setAcks((prev) => {
            const next = { ...prev }
            delete next[signalId]
            return next
          })
        }, ACK_MS)
      )
    } catch {
      // The signal keeps its status; say so and leave the buttons to retry.
      setFailedId(signalId)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card>
      <p className="text-sm text-white mb-1">{t('title')}</p>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('subtitle')}</p>
      <div className="space-y-4">
        {candidates.map((signal) => {
          const ack = acks[signal.signalId]
          if (ack) {
            return (
              <p key={signal.signalId} role="status" className="animate-fade-in text-sm text-white/80 leading-relaxed rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3">
                {ack === 'confirmed' ? t('confirmedAck') : t('rejectedAck')}
              </p>
            )
          }
          return (
            <div key={signal.signalId}>
              <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/40 border border-[var(--color-violet-800)]/60 rounded-full px-2 py-0.5 mb-2">
                {t(`domains.${signal.domain satisfies TwinSignalDomain}`)}
              </span>
              <p className="text-white text-sm leading-relaxed mb-3">{signal.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(signal.signalId, 'confirm')}
                  disabled={pendingId === signal.signalId}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => handleAction(signal.signalId, 'reject')}
                  disabled={pendingId === signal.signalId}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                >
                  {t('notQuite')}
                </button>
              </div>
              {failedId === signal.signalId && <p className="text-xs text-red-300 mt-2">{t('failed')}</p>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
