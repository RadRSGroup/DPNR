'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wallet, Target, Hexagon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCredits, getCreditsTransactions, getPlans } from '@/lib/api/v1-client'
import type { CreditsResponse, CreditsTransactionsResponse, PlanSummary } from '@dpnr/shared-types'
import { EARN_COMMITMENT_COMPLETED_CREDITS, EARN_REFLECTION_COMPLETED_CREDITS } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'

/**
 * My Wallet (Slice 6 of the 6-slice reference-mockup parity plan,
 * `docs/AGENT_LOG.md`/`C:\Users\rekkawi\.claude\plans\mellow-questing-milner.md`)
 * — net-new page, real `GET /v1/credits`, `GET /v1/credits/transactions`
 * (both Slice 1), and `GET /v1/plans` (already existed, no prior caller).
 *
 * Per the project's Wallet-purchasing decision: the real plan/package
 * catalog renders, but every "Choose Plan"/"Buy" button stays disabled —
 * `initiate-purchase.ts` has unconfirmed field-shape guesses (ADR 0008) and
 * no real Grow credentials exist regardless, so nobody should be sent
 * through a checkout that can't finish. No real `PlanItem`s are seeded yet
 * either (blocked on a pack-pricing decision), so both catalog sections
 * honestly render empty rather than the reference's fabricated $9/$19/$39
 * and 100–2500-credit numbers.
 *
 * "Earn More Credits" only ships the two tiles with a real, non-gamified
 * backing: "Weekly Goal Achieved" (`POST /v1/commitments/{id}/complete`,
 * built this slice) and "Complete a Reflection" (a real one-time grant on
 * Mirror Room's own completion step). The reference's "Daily Check-in" and
 * "Practice Streak" tiles are streak-shaped and were dropped entirely, per
 * this project's already-made anti-addiction gamification decision, rather
 * than reskinned into something misleading. "Gift & Share Credits" is
 * greenfield (no referral/gift system exists anywhere) and is deliberately
 * not built this pass — flagged in the plan as a separate future slice.
 */

const REASON_LABELS: Record<string, string> = {
  beta_trial_signup: 'Welcome bonus',
  room_refine: 'Room refine',
  companion_message: 'Companion message',
  commitment_completed: 'Weekly Goal Achieved',
  reflection_completed: 'Completed a Reflection',
}

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

// priceMinorUnits assumes a 2-decimal-digit currency (agorot/cents), same
// assumption `dynamo/global-tables.ts`'s own PlanItem comment documents —
// revisit if a 0-decimal currency is ever added to the catalog.
function formatPrice(plan: PlanSummary): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(
      plan.priceMinorUnits / 100
    )
  } catch {
    return `${(plan.priceMinorUnits / 100).toFixed(2)} ${plan.currency}`
  }
}

function PlanCard({ plan }: { plan: PlanSummary }) {
  return (
    <Card className="flex flex-col">
      <p className="text-white text-sm font-medium">{plan.displayName}</p>
      <p className="text-white text-xl font-light mt-1">
        {formatPrice(plan)}
        {plan.billingFrequency === 'monthly' && <span className="text-xs text-white/40"> / month</span>}
      </p>
      <p className="text-xs text-white/40 mt-1 mb-4">{plan.credits} credits</p>
      <button
        disabled
        title="Purchasing isn't available yet — real payment credentials aren't set up."
        className="mt-auto w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-sm font-medium cursor-not-allowed"
      >
        Coming soon
      </button>
    </Card>
  )
}

export default function WalletPage() {
  const router = useRouter()
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [transactions, setTransactions] = useState<CreditsTransactionsResponse['transactions']>([])
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const [creditsData, txnData, plansData] = await Promise.all([
          getCredits(),
          getCreditsTransactions().catch(() => ({ transactions: [] })),
          getPlans().catch(() => ({ plans: [] })),
        ])
        setCredits(creditsData)
        setTransactions(txnData.transactions)
        setPlans(plansData.plans)
      } catch {
        // Degrades to the same empty-state tolerance every other page here uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const subscriptions = plans.filter((p) => p.kind === 'subscription')
  const creditPacks = plans.filter((p) => p.kind === 'credit_pack')

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
            My Wallet <Wallet className="w-5 h-5 text-[var(--color-violet-400)]" />
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Your credits, plans, and rewards — all in one place.
          </p>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Balance */}
          <Card>
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Your Balance</p>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <p className="text-white text-3xl font-light">
                  {credits ? credits.balance : loading ? '…' : 0}
                  <span className="text-sm text-white/40 font-normal ml-2">Credits</span>
                </p>
                {credits?.isExhausted && <p className="text-red-400/80 text-xs mt-1">Out of credits</p>}
                {credits && !credits.isExhausted && credits.isLow && (
                  <p className="text-yellow-400/80 text-xs mt-1">Running low</p>
                )}
              </div>
              <a
                href="#plans"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors"
              >
                Buy Credits
              </a>
            </div>
          </Card>

          {/* Earn More Credits */}
          <Card>
            <p className="text-sm text-white mb-1">Earn More Credits</p>
            <p className="text-xs text-white/40 mb-4">Grow your wallet by taking action and investing in yourself.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/evolution-map"
                className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
              >
                <Target className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                <p className="text-white text-sm font-medium">Weekly Goal Achieved</p>
                <p className="text-white/40 text-xs mt-1 mb-2">Complete a goal you set for yourself.</p>
                <p className="text-orange-300 text-xs font-medium">+{EARN_COMMITMENT_COMPLETED_CREDITS} Credits</p>
              </Link>
              <Link
                href="/mirror/new"
                className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
              >
                <Hexagon className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                <p className="text-white text-sm font-medium">Complete a Reflection</p>
                <p className="text-white/40 text-xs mt-1 mb-2">Finish a Mirror Room exercise.</p>
                <p className="text-orange-300 text-xs font-medium">+{EARN_REFLECTION_COMPLETED_CREDITS} Credits</p>
              </Link>
            </div>
          </Card>

          <div id="plans" className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
            {/* Choose Your Plan */}
            <Card>
              <p className="text-sm text-white mb-1">Choose Your Plan</p>
              <p className="text-xs text-white/40 mb-4">More credits. More insights. More you.</p>
              {loading ? (
                <p className="text-xs text-white/40">Loading…</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-xs text-white/40">
                  Plans are coming soon — pricing hasn&apos;t been finalized yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subscriptions.map((p) => <PlanCard key={p.planId} plan={p} />)}
                </div>
              )}
            </Card>

            {/* Buy Credit Packages */}
            <Card>
              <p className="text-sm text-white mb-1">Buy Credit Packages</p>
              <p className="text-xs text-white/40 mb-4">One-time credit packs. Use whenever you need.</p>
              {loading ? (
                <p className="text-xs text-white/40">Loading…</p>
              ) : creditPacks.length === 0 ? (
                <p className="text-xs text-white/40">
                  Credit packs are coming soon — pricing hasn&apos;t been finalized yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creditPacks.map((p) => <PlanCard key={p.planId} plan={p} />)}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <p className="text-sm text-white mb-1">Your Recent Transactions</p>
            <p className="text-xs text-white/40 mb-4">The real ledger behind your balance.</p>
            {loading ? (
              <p className="text-xs text-white/40">Loading…</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-white/40">No transactions yet.</p>
            ) : (
              <div className="space-y-1">
                {transactions.slice(0, 10).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {t.amount >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-400/70 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-white/30 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm truncate">{reasonLabel(t.reason)}</p>
                        <p className="text-white/30 text-xs">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium shrink-0 ${t.amount >= 0 ? 'text-green-400/80' : 'text-white/50'}`}>
                      {t.amount >= 0 ? '+' : ''}{t.amount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
