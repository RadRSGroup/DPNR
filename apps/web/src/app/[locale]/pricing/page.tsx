'use client'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

/**
 * Rewritten to match the real Credits model (MVP_ARCHITECTURE.md §5.6,
 * spec §Beta Trial & Credits contract) — the old copy here described a
 * 3-tier token-cap subscription (Free/Core $15/Pro $25, ILS billing) that
 * predates the Credits ledger and was never true of the new backend.
 * POST /v1/credits/purchase still isn't built (blocked on the real Grow
 * integration, see docs/PHASE_AUDIT.md's Session 10 update), so this stays
 * an honest "coming soon" page, not a working checkout — but it no longer
 * describes a commercial model the product doesn't actually have.
 */
export default function PricingPage() {
  const t = useTranslations('Pricing')
  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-16">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="pt-14 pb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-purple-400 text-sm">
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('back')}
        </Link>
        <h1 className="text-white text-2xl font-light mt-6">{t('title')}</h1>
        <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
      </div>

      <div className="mb-5 bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3">
        <p className="text-purple-300 text-sm">{t('betaBanner')}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl p-5 border bg-white/5 border-white/10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-white font-medium text-lg">{t('starterCredits')}</h2>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{t('starterCreditsSubtitle')}</p>
            </div>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              {t('noPaymentMethod')}
            </li>
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              {t('meaningfulActionsOnly')}
            </li>
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              {t('balanceVisible')}
            </li>
          </ul>
        </div>

        <div className="rounded-3xl p-5 border bg-white/5 border-white/10 opacity-60">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-white font-medium text-lg">{t('creditPacksPlans')}</h2>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{t('comingSoonDuringBeta')}</p>
            </div>
          </div>
          <button
            disabled
            className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium bg-white/5 text-[var(--color-text-tertiary)] cursor-not-allowed"
          >
            {t('comingSoon')}
          </button>
        </div>
      </div>

      <p className="text-center text-white/20 text-xs mt-8">{t('emailNotice')}</p>
    </div>
  )
}
