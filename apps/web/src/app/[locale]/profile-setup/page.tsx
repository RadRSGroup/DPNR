'use client'
import Image from 'next/image'
import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { updatePreferences } from '@/lib/api/v1-client'
import { markProfileSetupCompleteLocally } from '@/lib/cognito/client'
import GenderSelector from '@/components/shared/GenderSelector'
import AvatarUpload from '@/components/shared/AvatarUpload'
import type { GenderIdentity } from '@dpnr/shared-types'

/**
 * Session 51 — dedicated, one-time post-signin screen (gender + optional
 * photo), gated by `proxy.ts` exactly like `/consent` (a cookie mirroring
 * an ID-token claim, `custom:profileSetup`). Moved out of the signup form
 * per the user's own request, superseding Session 50's "fold into signup"
 * decision. Deterministic UI, not AI-driven — same reasoning that put the
 * mandatory recovery-code reveal on its own screen rather than folding it
 * into a conversation.
 */
function ProfileSetupContent() {
  const t = useTranslations('ProfileSetup')
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/companion'

  const [gender, setGender] = useState<GenderIdentity>('unspecified')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish() {
    markProfileSetupCompleteLocally()
    router.push(next)
    router.refresh()
  }

  async function handleContinue() {
    setSaving(true)
    setError(null)
    try {
      await updatePreferences({ genderIdentity: gender, profileSetupComplete: true })
      await finish()
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    setSaving(true)
    setError(null)
    try {
      await updatePreferences({ profileSetupComplete: true })
      await finish()
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 pb-10 min-h-screen flex flex-col">
        <div className="pt-16 pb-6 text-center">
          <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
          <h1 className="text-white text-xl font-light">{t('title')}</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
        </div>

        <div className="flex-1 space-y-6">
          <AvatarUpload avatarUrl={avatarUrl} onUploaded={setAvatarUrl} />

          <div>
            <label className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {t('gender')}
            </label>
            <p className="text-white/40 text-xs mb-2">{t('genderHint')}</p>
            <GenderSelector value={gender} onChange={setGender} />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={saving}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all"
          >
            {saving ? t('saving') : t('continueButton')}
          </button>
          <button
            onClick={handleSkip}
            disabled={saving}
            className="w-full text-white/50 hover:text-white/70 text-sm py-2 disabled:opacity-50"
          >
            {t('skipButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <ProfileSetupContent />
    </Suspense>
  )
}
