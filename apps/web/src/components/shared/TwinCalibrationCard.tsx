'use client'
import { useState } from 'react'
import { confirmTwinSignal, rejectTwinSignal } from '@/lib/api/v1-client'
import type { TwinSignalDomain, TwinListResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

const DOMAIN_LABEL: Record<TwinSignalDomain, string> = {
  pattern: 'Pattern',
  trigger: 'Trigger',
  value: 'Value',
  current_focus: 'Current Focus',
  direction: 'Direction',
  commitment: 'Commitment',
}

type Signal = TwinListResponse['signals'][number]

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
  const [pendingId, setPendingId] = useState<string | null>(null)
  const candidates = signals.filter((s) => s.status === 'candidate').slice(0, limit)

  if (candidates.length === 0) return null

  async function handleAction(signalId: string, action: 'confirm' | 'reject') {
    if (pendingId) return
    setPendingId(signalId)
    try {
      const res = action === 'confirm' ? await confirmTwinSignal(signalId) : await rejectTwinSignal(signalId)
      onSignalUpdated(signalId, res.status)
    } catch {
      // Leave the signal's status as-is — the buttons remain available to retry.
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card>
      <p className="text-sm text-white mb-1">What I&apos;m Noticing</p>
      <p className="text-xs text-white/40 mb-4">Confirm what&apos;s right, correct what isn&apos;t</p>
      <div className="space-y-4">
        {candidates.map((signal) => (
          <div key={signal.signalId}>
            <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-[var(--color-violet-300)] bg-[var(--color-violet-900)]/40 border border-[var(--color-violet-800)]/60 rounded-full px-2 py-0.5 mb-2">
              {DOMAIN_LABEL[signal.domain]}
            </span>
            <p className="text-white text-sm leading-relaxed mb-3">{signal.description}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction(signal.signalId, 'confirm')}
                disabled={pendingId === signal.signalId}
                className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => handleAction(signal.signalId, 'reject')}
                disabled={pendingId === signal.signalId}
                className="flex-1 rounded-xl px-3 py-2 text-xs font-medium bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                Not quite
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
