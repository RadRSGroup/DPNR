'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession, deleteCognitoUser, signOut } from '@/lib/cognito/client'
import { exportUserData, deleteAccountData, getCredits } from '@/lib/api/v1-client'
import type { CreditsResponse } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

/**
 * Reskinned onto the shared Sidebar/MobileNav shell + design tokens in
 * Slice 6 (`docs/AGENT_LOG.md`) — was still fully pre-redesign UI (its own
 * "← InnerOS" back link, hardcoded gradient/purple-* colors) until then.
 * The back link is dropped, not replaced: the persistent Sidebar/MobileNav
 * already provide that navigation on every other page. The Credits card's
 * "Upgrade" link now points to /wallet (the real in-app catalog, built the
 * same slice) instead of the old marketing /pricing page.
 */
export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession()
      if (!session) { router.push('/login'); return }
      const sessionEmail = session.getIdToken().payload.email as string | undefined
      setEmail(sessionEmail ?? '')
      setLoading(false)
      try {
        setCredits(await getCredits())
      } catch {
        // Degrades to no Credits card — same tolerance every other page here uses.
      }
    }
    load()
  }, [router])

  async function handleDownload() {
    setDownloading(true)
    try {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `decision-room-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm.toLowerCase() !== 'delete my account') return
    setDeleteStep('deleting')
    try {
      // Delete the DynamoDB partition first — a signed-out/deleted Cognito
      // session can no longer authenticate the /v1/account call.
      await deleteAccountData()
      await deleteCognitoUser()
      signOut()
      router.push('/?deleted=true')
    } catch {
      alert('Deletion failed. Please contact support.')
      setDeleteStep('confirm')
    }
  }

  if (loading) return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />
      <div className="w-8 h-8 border-2 border-[var(--color-violet-500)]/40 border-t-[var(--color-violet-500)] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pb-16 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white">Account</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{email}</p>
        </div>

        <div className="space-y-4">

          {/* Credits — the real ledger (GET /v1/credits, live since Session 11) had no
              Account-page caller until now; Dashboard's own reader was the only one.
              Purchasing more (POST /v1/credits/purchase) isn't built yet — pending the
              real Grow integration (see docs/PHASE_AUDIT.md's Session 10 update) — so
              "Upgrade" links to /wallet, it doesn't complete a purchase. */}
          <Card>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Credits</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-lg font-light">{credits ? credits.balance : '…'}</p>
                {credits?.isExhausted && (
                  <p className="text-red-400/80 text-xs mt-0.5">Out of credits</p>
                )}
                {credits && !credits.isExhausted && credits.isLow && (
                  <p className="text-yellow-400/80 text-xs mt-0.5">Running low</p>
                )}
              </div>
              <Link href="/wallet" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                {credits && (credits.isLow || credits.isExhausted) ? 'Upgrade' : 'View Wallet'}
              </Link>
            </div>
          </Card>

          {/* Plan — every account is honestly on the free Beta tier today, not a stored,
              per-user value; paid plans/packages aren't purchasable yet (see above). */}
          <Card>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Subscription</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Free — Beta</p>
                <p className="text-white/30 text-xs mt-0.5">Paid plans are coming soon</p>
              </div>
            </div>
          </Card>

          {/* Legal */}
          <Card className="space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Legal</p>
            <Link href="/terms" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
              Terms of Use <span className="text-white/20">›</span>
            </Link>
            <div className="border-t border-white/8" />
            <Link href="/privacy" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
              Privacy & Data Policy <span className="text-white/20">›</span>
            </Link>
          </Card>

          {/* Data */}
          <Card className="space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wide">Your Data</p>

            <div>
              <p className="text-white/80 text-sm font-medium">Download my data</p>
              <p className="text-white/40 text-xs mt-1 mb-3">
                Export all your decisions, reflections, and account data as a JSON file.
              </p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 rounded-2xl border border-[var(--color-violet-800)]/60 bg-[var(--color-violet-900)]/30 text-[var(--color-violet-300)] hover:bg-[var(--color-violet-900)]/50 disabled:opacity-40 text-sm font-medium transition-all"
              >
                {downloading ? 'Preparing export…' : 'Download my data'}
              </button>
            </div>

            <div className="border-t border-white/8 pt-4">
              <p className="text-white/80 text-sm font-medium">Delete my account</p>
              <p className="text-white/40 text-xs mt-1 mb-3">
                Permanently deletes your account and all decisions, reflections, and personal data. This cannot be undone.
              </p>

              {deleteStep === 'idle' && (
                <button
                  onClick={() => setDeleteStep('confirm')}
                  className="w-full py-3 rounded-2xl border border-red-900/40 text-red-400/70 hover:border-red-700/50 hover:text-red-400 text-sm transition-all"
                >
                  Delete my account
                </button>
              )}

              {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
                <div className="space-y-3 bg-red-950/20 border border-red-900/30 rounded-2xl p-4">
                  <p className="text-red-400 text-xs font-medium">This will permanently delete:</p>
                  <ul className="text-white/50 text-xs space-y-1 list-disc pl-4">
                    <li>All your decisions and reflections</li>
                    <li>Your account and login credentials</li>
                    <li>Your subscription (cancels immediately)</li>
                  </ul>
                  <p className="text-white/50 text-xs">
                    Type <span className="text-white/80 font-mono">delete my account</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="delete my account"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirm.toLowerCase() !== 'delete my account' || deleteStep === 'deleting'}
                      className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white text-sm font-medium transition-all"
                    >
                      {deleteStep === 'deleting' ? 'Deleting…' : 'Permanently delete'}
                    </button>
                    <button
                      onClick={() => { setDeleteStep('idle'); setDeleteConfirm('') }}
                      className="px-4 text-white/30 text-sm hover:text-white/50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Sign out */}
          <button
            onClick={() => {
              signOut()
              router.push('/login')
            }}
            className="w-full py-3.5 rounded-2xl border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-sm transition-all"
          >
            Sign out
          </button>

        </div>
      </div>
    </div>
  )
}
