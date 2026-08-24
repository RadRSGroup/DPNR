'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentSession } from '@/lib/cognito/client'
import { getTwin, confirmTwinSignal, rejectTwinSignal } from '@/lib/api/v1-client'
import type { TwinListResponse, TwinSignalDomain } from '@dpnr/shared-types'

/**
 * Digital Twin ("InnerSelf") frontend — the backend (GET /v1/twin,
 * confirm/reject) has been real since Session 10 with no caller until now.
 * Per MVP_ARCHITECTURE.md §5.4, deliberately a plain card list, not a fixed
 * map/graph/timeline visualization — the spec is emphatic that the visual
 * form is unlocked later, and swapping it out must not touch the data
 * model. Confirm/reject are legal from any current status (spec §5 Trust
 * rules: correction is normal, not a one-way ratchet), so both actions are
 * always shown, with whichever the signal currently holds highlighted.
 */

const DOMAIN_LABEL: Record<TwinSignalDomain, string> = {
  pattern: 'Pattern',
  trigger: 'Trigger',
  value: 'Value',
  current_focus: 'Current Focus',
  direction: 'Direction',
  commitment: 'Commitment',
}

type Signal = TwinListResponse['signals'][number]

export default function TwinPage() {
  const router = useRouter()
  const [userInitial, setUserInitial] = useState('?')
  const [signals, setSignals] = useState<Signal[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        setUserInitial(email?.[0]?.toUpperCase() ?? '?')

        const data = await getTwin()
        setSignals(data.signals)
      } catch {
        // Degrades to an empty state — same tolerance Dashboard/Companion use.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleAction(signalId: string, action: 'confirm' | 'reject') {
    if (pendingId) return
    setPendingId(signalId)
    try {
      const res = action === 'confirm' ? await confirmTwinSignal(signalId) : await rejectTwinSignal(signalId)
      setSignals((prev) => prev?.map((s) => (s.signalId === signalId ? { ...s, status: res.status } : s)) ?? prev)
    } catch {
      // Leave the signal's status as-is — the button remains available to retry.
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <h1 className="text-white text-xl font-light">InnerSelf</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-xs underline">
            InnerOS
          </Link>
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-700/40 flex items-center justify-center text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
            title="Account settings"
          >
            {userInitial}
          </Link>
        </div>
      </div>

      <p className="text-white/40 text-sm leading-relaxed mb-6">
        What DPNR has picked up about you so far, from your own sessions and conversations. Confirm what&apos;s
        right, correct what isn&apos;t — nothing here gets used without your say-so.
      </p>

      {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}

      {!loading && signals?.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/30 text-sm">
            Nothing here yet — your InnerSelf builds up as you use Decision Room, Mirror Room, and Companion.
          </p>
        </div>
      )}

      {!loading && signals && signals.length > 0 && (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.signalId} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-purple-300 bg-purple-900/30 border border-purple-700/50 rounded-full px-2 py-0.5 mb-2">
                {DOMAIN_LABEL[signal.domain]}
              </span>
              <p className="text-white text-sm leading-relaxed mb-3">{signal.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(signal.signalId, 'confirm')}
                  disabled={pendingId === signal.signalId}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    signal.status === 'confirmed'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {signal.status === 'confirmed' ? '✓ Confirmed' : 'Confirm'}
                </button>
                <button
                  onClick={() => handleAction(signal.signalId, 'reject')}
                  disabled={pendingId === signal.signalId}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                    signal.status === 'rejected'
                      ? 'bg-white/15 text-white'
                      : 'bg-white/5 border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {signal.status === 'rejected' ? 'Not quite ✓' : 'Not quite'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
