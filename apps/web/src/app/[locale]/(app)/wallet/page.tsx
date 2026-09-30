'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Wallet, Target, Hexagon, ArrowUpRight, ArrowDownRight, ArrowRight, Gift, Info, ShoppingCart, PlusCircle } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCredits, getCreditsTransactions, getPlans } from '@/lib/api/v1-client'
import type { CreditsResponse, CreditsTransactionsResponse, PlanSummary } from '@dpnr/shared-types'
import { EARN_COMMITMENT_COMPLETED_CREDITS, EARN_REFLECTION_COMPLETED_CREDITS } from '@dpnr/shared-types/constants'
import Card from '@/components/ui/Card'

/**
 * My Wallet — laid out against the founder's reference
 * (Drive → My Wallet → "My Wallet Page", Living Feedback Log 2026-09-29):
 * balance with the wallet art on top; plans and extra credits side by side
 * and clearly separate; Earn More Credits and Gift & Share below; the
 * ledger last. Reads `GET /v1/credits`, `GET /v1/credits/transactions` and
 * `GET /v1/plans`; no backend logic changed.
 *
 * Pricing comes from the plans catalog (`infra/cdk/scripts/plans.seed.ts`,
 * the founder's numbers). Free isn't a catalog item (no price, no monthly
 * grant), so it's a fixed card here. It's always the current plan: nothing
 * can set a paid `tier` while purchasing is off.
 *
 * Every "Choose plan"/"Buy" stays disabled: there is no payment provider
 * (Grow was removed in Session 83), so nobody is sent through a checkout
 * that can't finish. "Send a gift" is disabled for the same kind of reason:
 * no gift/referral system exists. The reference's per-plan feature lists
 * aren't shown; plans don't gate any features in code today, so those lines
 * would be promises the product doesn't keep.
 *
 * "Earn More Credits" only ships the two tiles with a real, non-gamified
 * backing: "Weekly Goal Achieved" (`POST /v1/commitments/{id}/complete`)
 * and "Complete a Reflection" (a one-time grant on Mirror Room's own
 * completion step). Streak-shaped tiles stay out, per the project's
 * gamification decision.
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

// priceMinorUnits assumes a 2-decimal-digit currency (cents/agorot), same
// assumption `dynamo/global-tables.ts`'s own PlanItem comment documents —
// revisit if a 0-decimal currency is ever added to the catalog. Whole
// amounts drop the ".00" ("$29", as in the reference).
function formatPrice(minorUnits: number, currency: string, locale: string): string {
  const amount = minorUnits / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

const byPrice = (a: PlanSummary, b: PlanSummary) => a.priceMinorUnits - b.priceMinorUnits

function DisabledAction({ label, title, primary = false }: { label: string; title: string; primary?: boolean }) {
  return (
    <button
      disabled
      title={title}
      className={`mt-auto w-full py-2 px-1 rounded-xl text-sm font-medium whitespace-nowrap cursor-not-allowed border ${
        primary
          ? 'bg-[var(--color-violet-600)]/35 border-[var(--color-violet-500)]/40 text-white/60'
          : 'bg-white/5 border-white/10 text-[var(--color-text-tertiary)]'
      }`}
    >
      {label}
    </button>
  )
}

function PlanTile({
  name, price, perMonth, detail, action,
}: {
  name: string
  price: string
  perMonth?: string
  detail: string
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white/[0.04] border border-white/10 p-4 min-w-0">
      <p className="text-white text-base">{name}</p>
      <p className="text-white text-2xl lg:text-3xl font-light mt-1">
        {price}
        {perMonth && <span className="text-xs text-[var(--color-text-tertiary)] ms-1">{perMonth}</span>}
      </p>
      <p className="text-sm text-white/70 mt-1 mb-4">{detail}</p>
      {action}
    </div>
  )
}

export default function WalletPage() {
  const t = useTranslations('Wallet')
  const ts = useTranslations('Shared')
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

  const subscriptions = plans.filter((p) => p.kind === 'subscription').sort(byPrice)
  // A $0 pack (the old Beta Trial display row) isn't something to buy.
  const creditPacks = plans.filter((p) => p.kind === 'credit_pack' && p.priceMinorUnits > 0).sort(byPrice)
  const currency = subscriptions[0]?.currency ?? creditPacks[0]?.currency ?? 'USD'
  const unavailable = t('plans.purchaseUnavailableTitle')

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/wallet-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] md:max-w-none mx-auto px-5 md:px-8 pb-10 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white flex items-center gap-2">
            {t('title')} <Wallet className="w-5 h-5 text-[var(--color-violet-400)]" />
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Balance, with the wallet art. The old banner's "Small gifts. Big
              impact." belonged to Gift & Share (founder: the gift image in
              the top banner led nowhere), so it moved down there. */}
          <Card className="relative overflow-hidden !p-0">
            <div className="relative h-36 md:hidden">
              <Image src="/images/wallet/wallet-hero.webp" alt="" fill sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)]/80 to-transparent" />
            </div>
            {/* Faded in with a mask, not a dark overlay, so it has no hard edge
                against the glass. */}
            <div className="hidden md:block absolute inset-y-0 end-0 w-[50%] [mask-image:linear-gradient(to_right,transparent,black_45%)] rtl:[mask-image:linear-gradient(to_left,transparent,black_45%)]">
              <Image src="/images/wallet/wallet-hero.webp" alt="" fill sizes="50vw" className="object-cover" />
            </div>
            <div className="relative p-5 md:p-7 md:w-[60%] flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
              <div className="min-w-0">
                <p className="text-white text-base">{t('balance.label')}</p>
                <p className="text-white text-4xl lg:text-5xl font-light mt-1">
                  {credits ? credits.balance : loading ? '…' : 0}
                  <span className="text-base text-white/70 font-normal ms-2">{t('balance.creditsUnit')}</span>
                </p>
                {credits?.isExhausted && <p className="text-red-400/80 text-xs mt-1">{t('balance.outOfCredits')}</p>}
                {credits && !credits.isExhausted && credits.isLow && (
                  <p className="text-yellow-400/80 text-xs mt-1">{t('balance.runningLow')}</p>
                )}
                <p className="text-sm text-white/60 mt-2 max-w-xs">{t('balance.description')}</p>
              </div>
              <div className="flex flex-col gap-2.5 sm:min-w-[12rem]">
                <a
                  href="#plans"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white transition-colors"
                >
                  <PlusCircle className="w-4 h-4" /> {t('balance.choosePlan')}
                </a>
                <a
                  href="#credit-packs"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-[var(--color-violet-500)]/60 hover:bg-white/5 text-white transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" /> {t('balance.buyCredits')}
                </a>
                <a href="#history" className="inline-flex items-center gap-1.5 text-sm text-orange-300 hover:text-orange-200 transition-colors">
                  {t('balance.viewHistory')} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
                </a>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 lg:gap-6">
            {/* Choose Your Plan: the subscription (access + monthly credits) */}
            <Card id="plans" className="scroll-mt-6">
              <p className="text-white text-lg">{t('plans.choosePlan.title')}</p>
              <p className="text-sm text-white/60 mt-0.5 mb-4">{t('plans.choosePlan.subtitle')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <PlanTile
                  name={t('plans.free.name')}
                  price={formatPrice(0, currency, locale)}
                  perMonth={t('plans.perMonth')}
                  detail={t('plans.free.detail')}
                  action={
                    <span className="mt-auto w-full py-2 rounded-xl text-sm text-center text-white/80 bg-white/5 border border-white/15">
                      {t('plans.currentPlan')}
                    </span>
                  }
                />
                {subscriptions.map((p) => (
                  <PlanTile
                    key={p.planId}
                    name={ts.has(`plans.${p.planId}`) ? ts(`plans.${p.planId}`) : p.displayName}
                    price={formatPrice(p.priceMinorUnits, p.currency, locale)}
                    perMonth={p.billingFrequency === 'monthly' ? t('plans.perMonth') : undefined}
                    detail={t('plans.monthlyCredits', { count: p.credits })}
                    action={<DisabledAction label={t('plans.comingSoonButton')} title={unavailable} primary />}
                  />
                ))}
              </div>
              {!loading && subscriptions.length === 0 && (
                <p className="text-xs text-[var(--color-text-tertiary)] mt-3">{t('plans.subscriptionsComingSoon')}</p>
              )}
            </Card>

            {/* Extra credits: on top of a plan, never instead of one */}
            <Card id="credit-packs" className="scroll-mt-6 flex flex-col">
              <p className="text-white text-lg">{t('plans.buyPackages.title')}</p>
              <p className="text-sm text-white/60 mt-0.5 mb-4">{t('plans.buyPackages.subtitle')}</p>
              {loading ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('plans.loading')}</p>
              ) : creditPacks.length === 0 ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('plans.packsComingSoon')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {creditPacks.map((p) => (
                    <div key={p.planId} className="flex flex-col rounded-2xl bg-white/[0.04] border border-white/10 p-3 lg:p-4 min-w-0">
                      <p className="text-white text-2xl font-light">{p.credits}</p>
                      <p className="text-xs text-white/60">{t('balance.creditsUnit')}</p>
                      <p className="text-white text-lg mt-2 mb-3">{formatPrice(p.priceMinorUnits, p.currency, locale)}</p>
                      <DisabledAction label={t('plans.comingSoonButton')} title={unavailable} />
                    </div>
                  ))}
                </div>
              )}
              <p className="flex items-start gap-2 text-xs text-white/55 mt-4">
                <Info className="w-4 h-4 shrink-0 mt-px" /> {t('plans.packsNote')}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Earn More Credits */}
            <Card>
              <p className="text-white text-lg">{t('earn.title')}</p>
              <p className="text-sm text-white/60 mt-0.5 mb-4">{t('earn.subtitle')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/mirror/new"
                  className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
                >
                  <Hexagon className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                  <p className="text-white text-sm font-medium">{t('earn.reflection.title')}</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-2">{t('earn.reflection.description')}</p>
                  <p className="text-orange-300 text-xs font-medium">{t('earn.creditsEarned', { count: EARN_REFLECTION_COMPLETED_CREDITS })}</p>
                </Link>
                <Link
                  href="/evolution-map"
                  className="rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-3.5"
                >
                  <Target className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                  <p className="text-white text-sm font-medium">{t('earn.weeklyGoal.title')}</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-2">{t('earn.weeklyGoal.description')}</p>
                  <p className="text-orange-300 text-xs font-medium">{t('earn.creditsEarned', { count: EARN_COMMITMENT_COMPLETED_CREDITS })}</p>
                </Link>
              </div>
            </Card>

            {/* Gift & Share: the founder's gift art, with an honest, disabled
                action until a gift system exists. */}
            <Card className="relative overflow-hidden">
              <div className="relative flex flex-col sm:flex-row lg:flex-col 2xl:flex-row gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-lg">{t('gift.title')}</p>
                  <p className="text-sm text-white/60 mt-0.5 mb-4">{t('gift.subtitle')}</p>
                  <button
                    disabled
                    title={t('gift.unavailableTitle')}
                    className="w-full flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-start cursor-not-allowed"
                  >
                    <Gift className="w-5 h-5 text-[var(--color-violet-300)] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-white/80">{t('gift.send')}</span>
                      <span className="block text-xs text-[var(--color-text-tertiary)]">{t('plans.comingSoonButton')}</span>
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-4 sm:w-[45%] lg:w-auto 2xl:w-[45%]">
                  <div className="relative w-28 h-24 lg:w-32 lg:h-28 shrink-0 rounded-xl overflow-hidden">
                    <Image src="/images/wallet/gift.webp" alt="" fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-white text-lg leading-tight">{t('hero.title')}</p>
                    <p className="text-xs text-white/60 mt-1">{t('gift.tagline')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card id="history" className="scroll-mt-6">
            <p className="text-white text-lg">{t('transactions.title')}</p>
            <p className="text-sm text-white/60 mt-0.5 mb-4">{t('transactions.subtitle')}</p>
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
