'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { getCurrentSession, deleteCognitoUser, changePassword } from '@/lib/cognito/client'
import { changePasswordAndRewrapDek } from '@/lib/auth/keyBootstrap'
import { logOut } from '@/lib/auth/logout'
import { setAvatarUrlEverywhere } from '@/lib/useAvatarUrl'
import { exportUserData, deleteAccountData, getCredits, getPreferences, updatePreferences, getDashboard, ApiError } from '@/lib/api/v1-client'
import { PREFERRED_NAME_MAX_LENGTH, type CreditsResponse, type GenderIdentity, type ChatBackground } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import PasswordCreationField, { passwordsReadyToSubmit } from '@/components/auth/PasswordCreationField'
import LanguageSelector from '@/components/shared/LanguageSelector'
import GenderSelector from '@/components/shared/GenderSelector'
import ChatBackgroundSelector from '@/components/shared/ChatBackgroundSelector'
import AvatarUpload from '@/components/shared/AvatarUpload'

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
  const t = useTranslations('Account')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [gender, setGender] = useState<GenderIdentity | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null) // null = not loaded yet
  const [savedFirstName, setSavedFirstName] = useState('')
  const [firstNameSaving, setFirstNameSaving] = useState(false)
  const [genderSaving, setGenderSaving] = useState(false)
  const [chatBackground, setChatBackground] = useState<ChatBackground | null>(null)
  const [chatBackgroundUrl, setChatBackgroundUrl] = useState<string | null>(null)
  const [chatBackgroundSaving, setChatBackgroundSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [visionRemaining, setVisionRemaining] = useState(0)
  const [roadmapDirection, setRoadmapDirection] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordChanged, setPasswordChanged] = useState(false)

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
      try {
        const preferences = await getPreferences()
        setGender(preferences.genderIdentity)
        setFirstName(preferences.firstName ?? '')
        setSavedFirstName(preferences.firstName ?? '')
        setAvatarUrl(preferences.avatarUrl)
        setChatBackground(preferences.chatBackground)
        setChatBackgroundUrl(preferences.chatBackgroundUrl)
        setVisionRemaining(preferences.visionRemainingThisMonth)
      } catch {
        // Degrades to the selector showing nothing pre-selected rather than
        // guessing — same "don't fabricate state" rule as the Credits card.
      }
      try {
        // Only used to offer "start from my Roadmap direction" in the Vision panel.
        setRoadmapDirection((await getDashboard()).roadmap?.direction ?? null)
      } catch {
        // No suggestion chip — the Vision panel works the same without it.
      }
    }
    load()
  }, [router])

  // Session 70: the name DPNR greets the person by. Saved on blur/Enter,
  // only when it actually changed; empty clears it (back to the email name).
  async function saveFirstName() {
    const next = (firstName ?? '').trim()
    if (firstName === null || next === savedFirstName) return
    setFirstNameSaving(true)
    try {
      const res = await updatePreferences({ firstName: next })
      setSavedFirstName(res.firstName ?? '')
      setFirstName(res.firstName ?? '')
    } catch {
      alert(t('preferences.nameSaveError'))
    } finally {
      setFirstNameSaving(false)
    }
  }

  async function handleGenderChange(next: GenderIdentity) {
    setGender(next) // optimistic — this is a low-stakes preference, not a destructive action
    setGenderSaving(true)
    try {
      await updatePreferences({ genderIdentity: next })
    } catch {
      alert(t('genderSaveError'))
    } finally {
      setGenderSaving(false)
    }
  }

  async function handleChatBackgroundChange(next: ChatBackground) {
    setChatBackground(next) // optimistic, same reasoning as gender above
    setChatBackgroundSaving(true)
    try {
      await updatePreferences({ chatBackground: next })
    } catch {
      alert(t('genderSaveError')) // the copy itself is generic ("Could not save — please try again."), reused rather than adding a duplicate string
    } finally {
      setChatBackgroundSaving(false)
    }
  }

  // `uploadChatBackground()` (called by ChatBackgroundSelector itself)
  // already persists `chatBackground: 'custom'` + the new key in the same
  // `PUT /v1/user/preferences` call — this just reflects that already-saved
  // result locally, no second write.
  function handleCustomBackgroundUploaded(url: string) {
    setChatBackgroundUrl(url)
    setChatBackground('custom')
  }

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
      alert(t('data.download.error'))
    } finally {
      setDownloading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordChanged(false)
    if (!passwordsReadyToSubmit(newPassword, confirmNewPassword)) {
      setPasswordError(t('security.errorPasswordRequirements'))
      return
    }
    setPasswordChanging(true)
    try {
      // Crypto re-wrap first, Cognito change second — see
      // changePasswordAndRewrapDek's own doc comment for why that order.
      // 'keys_not_found' means this account predates Phase 6 key bootstrap;
      // nothing to re-wrap, so the Cognito change alone is the whole story.
      try {
        await changePasswordAndRewrapDek(currentPassword, newPassword)
      } catch (err) {
        if (!(err instanceof ApiError && err.code === 'keys_not_found')) throw err
      }
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordChanged(true)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('security.errorGeneric'))
    } finally {
      setPasswordChanging(false)
    }
  }

  const deleteConfirmPhrase = t('data.delete.confirmPhrase')

  async function handleDelete() {
    if (deleteConfirm.toLowerCase() !== deleteConfirmPhrase.toLowerCase()) return
    setDeleteStep('deleting')
    try {
      // Delete the DynamoDB partition first — a signed-out/deleted Cognito
      // session can no longer authenticate the /v1/account call.
      await deleteAccountData()
      await deleteCognitoUser()
      await logOut()
      router.push('/?deleted=true')
    } catch {
      alert(t('data.delete.error'))
      setDeleteStep('confirm')
    }
  }

  if (loading) return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
      <div className="w-8 h-8 border-2 border-[var(--color-violet-500)]/40 border-t-[var(--color-violet-500)] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] lg:max-w-2xl mx-auto px-5 lg:px-8 pb-16 lg:pb-12">
        <div className="pt-14 lg:pt-8 pb-6">
          <h1 className="font-display text-2xl lg:text-3xl text-white">{t('title')}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{email}</p>
        </div>

        <div className="space-y-4">

          {/* Credits — the real ledger (GET /v1/credits, live since Session 11) had no
              Account-page caller until now; Dashboard's own reader was the only one.
              Purchasing more (POST /v1/credits/purchase) isn't built yet — pending the
              real Grow integration (see docs/PHASE_AUDIT.md's Session 10 update) — so
              "Upgrade" links to /wallet, it doesn't complete a purchase. */}
          <Card>
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-3">{t('credits.label')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-lg font-light">{credits ? credits.balance : '…'}</p>
                {credits?.isExhausted && (
                  <p className="text-red-400/80 text-xs mt-0.5">{t('credits.outOfCredits')}</p>
                )}
                {credits && !credits.isExhausted && credits.isLow && (
                  <p className="text-yellow-400/80 text-xs mt-0.5">{t('credits.runningLow')}</p>
                )}
              </div>
              <Link href="/wallet" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                {credits && (credits.isLow || credits.isExhausted) ? t('credits.upgrade') : t('credits.viewWallet')}
              </Link>
            </div>
          </Card>

          {/* Plan — every account is honestly on the free Beta tier today, not a stored,
              per-user value; paid plans/packages aren't purchasable yet (see above). */}
          <Card>
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-3">{t('subscription.label')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{t('subscription.freeBeta')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{t('subscription.comingSoon')}</p>
              </div>
            </div>
          </Card>

          {/* Summary for my therapist (docs/PROVIDER_SUMMARY_PLAN.md, Slice 1). */}
          <Card className="space-y-2">
            <p className="text-white/85 text-sm">{t('therapistSummary.title')}</p>
            <p className="text-[var(--color-text-tertiary)] text-xs">{t('therapistSummary.body')}</p>
            <Link
              href="/therapist-summary"
              className="inline-block rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white text-xs px-4 py-2 transition-colors"
            >
              {t('therapistSummary.cta')}
            </Link>
          </Card>

          {/* Preferences — docs/HEBREW_LOCALIZATION_PLAN.md Slice B. Language
              switches immediately (LanguageSelector re-routes the whole page);
              gender is used only to pick correct Hebrew grammatical gender in
              future AI-generated responses (Slice E) and does nothing while
              English is selected. `gender === null` means the read hasn't
              resolved yet (or failed) — the selector is hidden rather than
              shown pre-selected to a guessed value. */}
          <Card className="space-y-3">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">{t('preferences.label')}</p>
            <AvatarUpload
              avatarUrl={avatarUrl}
              onUploaded={(url) => {
                setAvatarUrl(url)
                setAvatarUrlEverywhere(url) // sidebar/header/nav update without a reload
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">{t('preferences.language')}</span>
              <LanguageSelector />
            </div>
            {firstName !== null && (
              <div>
                <label htmlFor="account-first-name" className="block text-white/80 text-sm mb-2">{t('preferences.name')}</label>
                <p className="text-[var(--color-text-tertiary)] text-xs mb-3">{t('preferences.nameHint')}</p>
                <input
                  id="account-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  maxLength={PREFERRED_NAME_MAX_LENGTH}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={saveFirstName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  disabled={firstNameSaving}
                  placeholder={t('preferences.namePlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-violet-500)]/60 disabled:opacity-60"
                />
              </div>
            )}
            {gender !== null && (
              <div>
                <p className="text-white/80 text-sm mb-2">{t('preferences.gender')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mb-3">
                  {t('preferences.genderHint')}
                </p>
                <GenderSelector value={gender} onChange={handleGenderChange} className={genderSaving ? 'opacity-60 pointer-events-none' : ''} />
              </div>
            )}
            {chatBackground !== null && (
              <div>
                <p className="text-white/80 text-sm mb-2">{t('preferences.chatBackground')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mb-3">
                  {t('preferences.chatBackgroundHint')}
                </p>
                <ChatBackgroundSelector
                  value={chatBackground}
                  onChange={handleChatBackgroundChange}
                  customUrl={chatBackgroundUrl}
                  onCustomUploaded={handleCustomBackgroundUploaded}
                  hasAvatar={avatarUrl !== null}
                  visionRemaining={visionRemaining}
                  onVisionRemainingChange={setVisionRemaining}
                  roadmapDirection={roadmapDirection}
                  className={chatBackgroundSaving ? 'opacity-60 pointer-events-none' : ''}
                />
              </div>
            )}
          </Card>

          {/* Security — direct signed-in password change (`PUT /v1/keys` +
              Cognito's own changePassword), distinct from the separate
              forgot-password flow reachable from /login. Flagged open in
              docs/AGENT_LOG.md since Session 33, since the forgot-password
              build only ever covered the "don't know current password"
              path. */}
          <Card className="space-y-3">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">{t('security.label')}</p>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input
                type="password"
                placeholder={t('security.currentPasswordPlaceholder')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
              />
              <PasswordCreationField
                password={newPassword}
                onPasswordChange={setNewPassword}
                confirmPassword={confirmNewPassword}
                onConfirmPasswordChange={setConfirmNewPassword}
                passwordPlaceholder={t('security.newPasswordPlaceholder')}
                confirmPlaceholder={t('security.confirmNewPasswordPlaceholder')}
              />
              {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
              {passwordChanged && <p className="text-green-400/80 text-xs">{t('security.passwordChanged')}</p>}
              <button
                type="submit"
                disabled={passwordChanging || !passwordsReadyToSubmit(newPassword, confirmNewPassword)}
                className="w-full py-3 rounded-2xl border border-[var(--color-violet-800)]/60 bg-[var(--color-violet-900)]/30 text-[var(--color-violet-300)] hover:bg-[var(--color-violet-900)]/50 disabled:opacity-40 text-sm font-medium transition-all"
              >
                {passwordChanging ? t('security.changing') : t('security.changePassword')}
              </button>
            </form>
          </Card>

          {/* Legal */}
          <Card className="space-y-3">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">{t('legal.label')}</p>
            <Link href="/terms" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
              {t('legal.terms')} <span className="text-white/20 rtl:-scale-x-100">›</span>
            </Link>
            <div className="border-t border-white/8" />
            <Link href="/privacy" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
              {t('legal.privacy')} <span className="text-white/20 rtl:-scale-x-100">›</span>
            </Link>
          </Card>

          {/* Data */}
          <Card className="space-y-4">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide">{t('data.label')}</p>

            <div>
              <p className="text-white/80 text-sm font-medium">{t('data.download.title')}</p>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-3">
                {t('data.download.description')}
              </p>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3 rounded-2xl border border-[var(--color-violet-800)]/60 bg-[var(--color-violet-900)]/30 text-[var(--color-violet-300)] hover:bg-[var(--color-violet-900)]/50 disabled:opacity-40 text-sm font-medium transition-all"
              >
                {downloading ? t('data.download.preparing') : t('data.download.button')}
              </button>
            </div>

            <div className="border-t border-white/8 pt-4">
              <p className="text-white/80 text-sm font-medium">{t('data.delete.title')}</p>
              <p className="text-[var(--color-text-tertiary)] text-xs mt-1 mb-3">
                {t('data.delete.description')}
              </p>

              {deleteStep === 'idle' && (
                <button
                  onClick={() => setDeleteStep('confirm')}
                  className="w-full py-3 rounded-2xl border border-red-900/40 text-red-400/70 hover:border-red-700/50 hover:text-red-400 text-sm transition-all"
                >
                  {t('data.delete.title')}
                </button>
              )}

              {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
                <div className="space-y-3 bg-red-950/20 border border-red-900/30 rounded-2xl p-4">
                  <p className="text-red-400 text-xs font-medium">{t('data.delete.warningTitle')}</p>
                  <ul className="text-white/50 text-xs space-y-1 list-disc ps-4">
                    <li>{t('data.delete.items.decisions')}</li>
                    <li>{t('data.delete.items.account')}</li>
                    <li>{t('data.delete.items.subscription')}</li>
                  </ul>
                  <p className="text-white/50 text-xs">
                    {t.rich('data.delete.confirmPrompt', {
                      phrase: () => <span className="text-white/80 font-mono">{deleteConfirmPhrase}</span>,
                    })}
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder={deleteConfirmPhrase}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteConfirm.toLowerCase() !== deleteConfirmPhrase.toLowerCase() || deleteStep === 'deleting'}
                      className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white text-sm font-medium transition-all"
                    >
                      {deleteStep === 'deleting' ? t('data.delete.deleting') : t('data.delete.permanentlyDelete')}
                    </button>
                    <button
                      onClick={() => { setDeleteStep('idle'); setDeleteConfirm('') }}
                      className="px-4 text-[var(--color-text-tertiary)] text-sm hover:text-white/50 transition-colors"
                    >
                      {t('data.delete.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Sign out */}
          <button
            onClick={async () => {
              await logOut()
              router.push('/login')
            }}
            className="w-full py-3.5 rounded-2xl border border-white/10 text-[var(--color-text-tertiary)] hover:text-white/60 hover:border-white/20 text-sm transition-all"
          >
            {t('signOut')}
          </button>

        </div>
      </div>
    </div>
  )
}
