'use client'
import Image from 'next/image'
import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { updateOnboardingSnapshot } from '@/lib/api/v1-client'
import { markOnboardingCompleteLocally } from '@/lib/cognito/client'

/**
 * First-Time Onboarding, Slice A (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4) —
 * dedicated, one-time post-profile-setup screen, gated by `proxy.ts` exactly
 * like `/consent`/`/profile-setup` (a cookie mirroring an ID-token claim,
 * `custom:onboardingComplete`).
 *
 * Deliberately a placeholder, not yet the four-card sequence
 * (`DPNR_First_Time_Onboarding_MVP_Implementation_Guide_v3.pdf` §5.2–5.5) —
 * that's Slice B. This screen exists so Slice A's schema/claim/gate can
 * ship as a real, working, non-breaking increment: without SOME screen here
 * that actually completes the flow, every new signup would dead-end behind
 * this gate the moment it went live, per this project's own "a half-built
 * feature that leaves the app broken is worse than a missing one" guardrail.
 * Its single action calls the same `PUT /v1/user/onboarding-snapshot`
 * endpoint Slice B's cards will call field-by-field, just with only
 * `completed: true` — so this screen is replaced by the real cards in
 * Slice B, not superseded by a different mechanism.
 */
function OnboardingContent() {
  const t = useTranslations('Onboarding')
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/companion'

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      await updateOnboardingSnapshot({ completed: true })
      markOnboardingCompleteLocally()
      router.push(next)
      router.refresh()
    } catch {
      setError(t('errorGeneric'))
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 pb-10 min-h-screen flex flex-col justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-4">✦</div>
          <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
          <h1 className="text-white text-xl font-light">{t('title')}</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3 mt-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all mt-8"
        >
          {saving ? t('continuing') : t('continueButton')}
        </button>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <OnboardingContent />
    </Suspense>
  )
}
