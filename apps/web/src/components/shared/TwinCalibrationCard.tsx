'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { confirmTwinSignal, rejectTwinSignal } from '@/lib/api/v1-client'
import type { TwinSignalDomain, TwinListResponse, TwinRejectReason } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import Dictatable from '@/components/ui/Dictatable'

type Signal = TwinListResponse['signals'][number]

/** How long the confirm acknowledgement stays before the reflection leaves. */
const ACK_MS = 3500
const REASONS: TwinRejectReason[] = ['not_really', 'partly', 'different']

type Phase =
  | { kind: 'confirmed' }
  | { kind: 'rejected'; writing: boolean; text: string; saving: boolean }
  | { kind: 'noted' }

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
 * waiting on the user to calibrate. Already-confirmed signals surface
 * elsewhere (Patterns Track, Life Domains, Leading Archetypes); rejected
 * ones are never re-shown here, per spec §9's "stop asserting; do not
 * repeatedly reassert a rejected interpretation."
 *
 * Founder feedback 2026-09-27 ("DPNR reflects → I calibrate → DPNR learns"):
 * - At most `limit` (2) reflections, the clearest and newest first; the card
 *   hides when there are none rather than inventing one to fill it.
 * - Confirm acknowledges at once, then the reflection leaves.
 * - Not quite thanks the person and offers an optional follow-up (Not
 *   really / Partly / It's different for me, and "tell me what feels more
 *   accurate"), stored with the rejection so extraction doesn't propose the
 *   same reading again. The reflection stays until they choose or tap Done.
 * No score language anywhere.
 */
export default function TwinCalibrationCard({
  signals,
  onSignalUpdated,
  limit = 2,
}: {
  signals: Signal[]
  onSignalUpdated: (signalId: string, status: Signal['status']) => void
  limit?: number
}) {
  const t = useTranslations('Dashboard.calibration')
  const [failedId, setFailedId] = useState<string | null>(null)
  const [phases, setPhases] = useState<Record<string, Phase>>({})
  const timers = useRef<number[]>([])
  // The list arrives newest-updated first; rank by how clearly DPNR sees it,
  // keeping that order among equals (Array.sort is stable).
  const candidates = signals
    .filter((s) => s.status === 'candidate')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((id) => window.clearTimeout(id))
  }, [])

  if (candidates.length === 0) return null

  function setPhase(id: string, phase: Phase | null) {
    setPhases((prev) => {
      const next = { ...prev }
      if (phase) next[id] = phase
      else delete next[id]
      return next
    })
  }

  function leaveAfter(id: string, status: Signal['status'], ms: number) {
    timers.current.push(
      window.setTimeout(() => {
        onSignalUpdated(id, status)
        setPhase(id, null)
      }, ms)
    )
  }

  async function confirm(id: string) {
    setFailedId(null)
    setPhase(id, { kind: 'confirmed' }) // acknowledge at once; the call can take a few seconds
    try {
      const res = await confirmTwinSignal(id)
      leaveAfter(id, res.status, ACK_MS)
    } catch {
      setPhase(id, null)
      setFailedId(id)
    }
  }

  async function reject(id: string) {
    setFailedId(null)
    setPhase(id, { kind: 'rejected', writing: false, text: '', saving: false })
    try {
      await rejectTwinSignal(id)
    } catch {
      setPhase(id, null)
      setFailedId(id)
    }
  }

  async function sendFollowUp(id: string, followUp: { reason?: TwinRejectReason; correction?: string }) {
    const current = phases[id]
    if (current?.kind === 'rejected') setPhase(id, { ...current, saving: true })
    try {
      await rejectTwinSignal(id, followUp)
      setPhase(id, { kind: 'noted' })
      leaveAfter(id, 'rejected', 2500)
    } catch {
      if (current?.kind === 'rejected') setPhase(id, { ...current, saving: false })
      setFailedId(id)
    }
  }

  const chip =
    'rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50'
  const box = 'animate-fade-in text-sm text-white/80 leading-relaxed rounded-xl bg-white/[0.04] border border-white/10 px-3 py-3'

  return (
    <Card>
      <p className="text-sm text-white mb-1">{t('title')}</p>
      <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('subtitle')}</p>
      <div className="space-y-4">
        {candidates.map((signal) => {
          const phase = phases[signal.signalId]
          if (phase?.kind === 'confirmed') {
            return <p key={signal.signalId} role="status" className={box}>{t('confirmedAck')}</p>
          }
          if (phase?.kind === 'noted') {
            return <p key={signal.signalId} role="status" className={box}>{t('thanksNoted')}</p>
          }
          if (phase?.kind === 'rejected') {
            return (
              <div key={signal.signalId} className={`${box} space-y-3`}>
                <p role="status">{t('rejectedAck')}</p>
                <p className="text-xs text-white/55">{t('whatFits')}</p>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button key={r} type="button" disabled={phase.saving} onClick={() => sendFollowUp(signal.signalId, { reason: r })} className={chip}>
                      {t(`reasons.${r}`)}
                    </button>
                  ))}
                </div>
                {phase.writing ? (
                  <div className="space-y-2">
                    <Dictatable>
                      <textarea
                        value={phase.text}
                        onChange={(e) => setPhase(signal.signalId, { ...phase, text: e.target.value.slice(0, 500) })}
                        placeholder={t('correctionPlaceholder')}
                        aria-label={t('tellMore')}
                        rows={2}
                        className="w-full resize-none rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60"
                      />
                    </Dictatable>
                    <button
                      type="button"
                      disabled={phase.saving || !phase.text.trim()}
                      onClick={() => sendFollowUp(signal.signalId, { reason: 'different', correction: phase.text.trim() })}
                      className="rounded-xl px-3 py-1.5 text-xs font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors disabled:opacity-50"
                    >
                      {t('send')}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setPhase(signal.signalId, { ...phase, writing: true })} className="text-xs text-[var(--color-violet-300)] hover:text-white transition-colors">
                    {t('tellMore')}
                  </button>
                )}
                <div className="flex justify-end">
                  <button type="button" onClick={() => leaveAfter(signal.signalId, 'rejected', 0)} className="text-xs text-white/50 hover:text-white transition-colors">
                    {t('done')}
                  </button>
                </div>
                {failedId === signal.signalId && <p className="text-xs text-red-300">{t('failed')}</p>}
              </div>
            )
          }
          return (
            <div key={signal.signalId}>
              <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/40 border border-[var(--color-violet-800)]/60 rounded-full px-2 py-0.5 mb-2">
                {signal.name ?? t(`domains.${signal.domain satisfies TwinSignalDomain}`)}
              </span>
              <p className="text-white text-sm leading-relaxed mb-3">{signal.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => confirm(signal.signalId)}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {t('confirm')}
                </button>
                <button
                  onClick={() => reject(signal.signalId)}
                  className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
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
