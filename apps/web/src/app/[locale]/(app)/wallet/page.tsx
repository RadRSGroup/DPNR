'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
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

// Values are translation keys into Wallet.transactions.reasons, not
// display text — resolved via t() at render time, module scope has no
// hook access.
const REASON_KEYS: Record<string, string> = {
  beta_trial_signup: 'betaTrialSignup',
  room_refine: 'roomRefine',
  companion_message: 'companionMessage',
  commitment_completed: 'commitmentCompleted',
  reflection_completed: 'reflectionCompleted',
}

function reasonLabel(reason: string, t: ReturnType<typeof useTranslations>): string {
  const key = REASON_KEYS[reason]
  // Fallback for a reason code not yet in the map — operates on the raw
  // backend enum string, which is inherently English/snake_case; not
  // translated, since there's no real text to translate, just a code.
  return key ? t(`transactions.reasons.${key}`) : reason.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

// priceMinorUnits assumes a 2-decimal-digit currency (agorot/cents), same
// assumption `dynamo/global-tables.ts`'s own PlanItem comment documents —
// revisit if a 0-decimal currency is ever added to the catalog.
function formatPrice(plan: PlanSummary, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(
      plan.priceMinorUnits / 100
    )
  } catch {
    return `${(plan.priceMinorUnits / 100).toFixed(2)} ${plan.currency}`
  }
}

function PlanCard({ plan, locale, t }: { plan: PlanSummary; locale: string; t: ReturnType<typeof useTranslations> }) {
  return (
    <Card className="flex flex-col">
      <p className="text-white text-sm font-medium">{plan.displayName}</p>
      <p className="text-white text-xl font-light mt-1">
        {formatPrice(plan, locale)}
        {plan.billingFrequency === 'monthly' && <span className="text-xs text-[var(--color-text-tertiary)]"> {t('plans.perMonth')}</span>}
      </p>
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1 mb-4">{t('plans.creditsCount', { count: plan.credits })}</p>
      <button
        disabled
        title={t('plans.purchaseUnavailableTitle')}
        className="mt-auto w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--color-text-tertiary)] text-sm font-medium cursor-not-allowed"
      >
        {t('plans.comingSoonButton')}
      </button>
    </Card>
  )
}

export default function WalletPage() {
  const t = useTranslations('Wallet')
  const locale = useLocale()
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
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/wallet-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-none mx-auto px-5 lg:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
            {t('title')} <Wallet className="w-5 h-5 text-[var(--color-violet-400)]" />
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('subtitle')}
          </p>
        </div>

        <Card className="relative overflow-hidden !p-0 mb-4 lg:mb-6 hidden lg:block">
          <div className="relative h-40 lg:h-48">
            <Image
              src="/images/wallet/wallet-hero.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col items-start justify-end p-5 lg:p-8">
              <h2 className="font-display text-xl lg:text-2xl text-white">{t('hero.title')}</h2>
              <p className="text-white/60 text-sm mt-1 max-w-sm">{t('hero.subtitle')}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 lg:space-y-6">
          {/* Balance */}
          <Card>
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-2">{t('balance.label')}</p>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <p className="text-white text-3xl font-light">
                  {credits ? credits.balance : loading ? '…' : 0}
                  <span className="text-sm text-[var(--color-text-tertiary)] font-normal ms-2">{t('balance.creditsUnit')}</span>
                </p>
                {credits?.isExhausted && <p className="text-red-400/80 text-xs mt-1">{t('balance.outOfCredits')}</p>}
                {credits && !credits.isExhausted && credits.isLow && (
                  <p className="text-yellow-400/80 text-xs mt-1">{t('balance.runningLow')}</p>
                )}
              </div>
              <a
                href="#plans"
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors"
              >
                {t('balance.buyCredits')}
              </a>
            </div>
          </Card>

          {/* Earn More Credits */}
          <Card>
            <p className="text-sm text-white mb-1">{t('earn.title')}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('earn.subtitle')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/evolution-map"
                className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
              >
                <Target className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                <p className="text-white text-sm font-medium">{t('earn.weeklyGoal.title')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-2">{t('earn.weeklyGoal.description')}</p>
                <p className="text-orange-300 text-xs font-medium">{t('earn.creditsEarned', { count: EARN_COMMITMENT_COMPLETED_CREDITS })}</p>
              </Link>
              <Link
                href="/mirror/new"
                className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
              >
                <Hexagon className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                <p className="text-white text-sm font-medium">{t('earn.reflection.title')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-2">{t('earn.reflection.description')}</p>
                <p className="text-orange-300 text-xs font-medium">{t('earn.creditsEarned', { count: EARN_REFLECTION_COMPLETED_CREDITS })}</p>
              </Link>
            </div>
          </Card>

          <div id="plans" className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
            {/* Choose Your Plan */}
            <Card>
              <p className="text-sm text-white mb-1">{t('plans.choosePlan.title')}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('plans.choosePlan.subtitle')}</p>
              {loading ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('plans.loading')}</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {t('plans.subscriptionsComingSoon')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subscriptions.map((p) => <PlanCard key={p.planId} plan={p} locale={locale} t={t} />)}
                </div>
              )}
            </Card>

            {/* Buy Credit Packages */}
            <Card>
              <p className="text-sm text-white mb-1">{t('plans.buyPackages.title')}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('plans.buyPackages.subtitle')}</p>
              {loading ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('plans.loading')}</p>
              ) : creditPacks.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  {t('plans.packsComingSoon')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creditPacks.map((p) => <PlanCard key={p.planId} plan={p} locale={locale} t={t} />)}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <p className="text-sm text-white mb-1">{t('transactions.title')}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mb-4">{t('transactions.subtitle')}</p>
            {loading ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('transactions.loading')}</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('transactions.empty')}</p>
            ) : (
              <div className="space-y-1">
                {transactions.slice(0, 10).map((txn, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {txn.amount >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-400/70 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm truncate">{reasonLabel(txn.reason, t)}</p>
                        <p className="text-[var(--color-text-tertiary)] text-xs">{new Date(txn.createdAt).toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium shrink-0 ${txn.amount >= 0 ? 'text-green-400/80' : 'text-white/50'}`}>
                      {txn.amount >= 0 ? '+' : ''}{txn.amount}
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
