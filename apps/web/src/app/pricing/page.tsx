'use client'
import Image from 'next/image'
import Link from 'next/link'

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
  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-16">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="pt-14 pb-8">
        <Link href="/dashboard" className="text-purple-400 text-sm">← Back</Link>
        <h1 className="text-white text-2xl font-light mt-6">Credits & Packages</h1>
        <p className="text-[var(--color-text-tertiary)] text-sm mt-2">
          DPNR runs on Credits, not a fixed monthly tier — you spend them only on real, meaningful actions.
        </p>
      </div>

      <div className="mb-5 bg-purple-900/20 border border-purple-700/30 rounded-2xl px-4 py-3">
        <p className="text-purple-300 text-sm">
          Every Beta account starts with free starter Credits — no payment method required. Credit packs and
          plans are coming soon; everyone stays on their starter balance until then.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl p-5 border bg-white/5 border-white/10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-white font-medium text-lg">Starter Credits</h2>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">Included free at signup</p>
            </div>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              No card or payment method needed
            </li>
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              Spent only on meaningful actions — never a surprise charge
            </li>
            <li className="flex items-center gap-2 text-sm text-white/60">
              <span className="text-purple-400 text-xs">✓</span>
              Your balance is always visible from Account
            </li>
          </ul>
        </div>

        <div className="rounded-3xl p-5 border bg-white/5 border-white/10 opacity-60">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="text-white font-medium text-lg">Credit packs & plans</h2>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">Coming soon during Beta</p>
            </div>
          </div>
          <button
            disabled
            className="w-full rounded-2xl px-5 py-3.5 text-sm font-medium bg-white/5 text-[var(--color-text-tertiary)] cursor-not-allowed"
          >
            Coming soon
          </button>
        </div>
      </div>

      <p className="text-center text-white/20 text-xs mt-8">
        We&apos;ll email everyone when Credit packs and plans open up.
      </p>
    </div>
  )
}
