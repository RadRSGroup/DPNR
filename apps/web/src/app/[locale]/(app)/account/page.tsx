'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { getCurrentSession, deleteCognitoUser, changePassword, isFederatedOnly } from '@/lib/cognito/client'
import { changePasswordAndRewrapDek } from '@/lib/auth/keyBootstrap'
import { logOut } from '@/lib/auth/logout'
import { setAvatarUrlEverywhere } from '@/lib/useAvatarUrl'
import { exportUserData, deleteAccountData, getCredits, getPreferences, updatePreferences, ApiError } from '@/lib/api/v1-client'
import { PREFERRED_NAME_MAX_LENGTH, type CreditsResponse, type GenderIdentity, type ChatBackground } from '@dpnr/shared-types'
import Card from '@/components/ui/Card'
import PasswordCreationField, { passwordsReadyToSubmit } from '@/components/auth/PasswordCreationField'
import LanguageSelector from '@/components/shared/LanguageSelector'
import GenderSelector from '@/components/shared/GenderSelector'
import ChatBackgroundSelector from '@/components/shared/ChatBackgroundSelector'
import AvatarUpload from '@/components/shared/AvatarUpload'
import RitualsCard from '@/components/profile/RitualsCard'
import PlaylistsCard from '@/components/profile/PlaylistsCard'

/**
 * My Profile. Session 74 (Wave 2 Slice 5, founder feedback #16): re-laid
 * out after the approved reference (Drive "My Profile"); adds Self
 * Reflection (-> /journal), My Rituals and a compact My Playlists. All the
 * controls and handlers below predate that and are unchanged.
 *
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
      } catch {
        // Degrades to the selector showing nothing pre-selected rather than
        // guessing — same "don't fabricate state" rule as the Credits card.
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
      // A Google-only account has no Cognito password: its DPNR password
      // only protects the keys, so the re-wrap above is the whole change.
      const session = await getCurrentSession()
      if (!session || !isFederatedOnly(session)) {
        await changePassword(currentPassword, newPassword)
      }
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

  const displayName = savedFirstName || email.split('@')[0]
  const sectionLabel = 'text-[var(--color-text-tertiary)] text-[11px] uppercase tracking-[0.14em]'
  const rowLink = 'flex items-center justify-between gap-3 py-2.5 text-sm text-white/70 hover:text-white transition-colors'
  const quietButton = 'w-full py-2.5 rounded-2xl border border-[var(--color-violet-800)]/60 bg-[var(--color-violet-900)]/30 text-[var(--color-violet-300)] hover:bg-[var(--color-violet-900)]/50 disabled:opacity-40 text-sm font-medium transition-all'

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      {/* My Profile (founder feedback #16, Session 74), laid out after the
          approved reference: Self Reflection + Personalize first, a compact
          Rituals/Playlists column, then Account / Security / Legal & Data.
          On phones the grid collapses in DOM order, which is the brief's
          priority order; on desktop the right column sits beside Self
          Reflection. Every control below is the page's existing behavior. */}
      <div className="max-w-[440px] lg:max-w-6xl mx-auto px-5 lg:px-8 pb-16 lg:pb-12">
        <header className="flex items-center gap-4 pt-14 lg:pt-8 pb-6">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-14 w-14 lg:h-16 lg:w-16 rounded-full object-cover border border-white/15" />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl lg:text-3xl text-white truncate">{t('profile.welcome', { name: displayName })}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{t('profile.subtitle')}</p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">

          {/* Self Reflection — the journal, the page's main reflective area. */}
          <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-white/10 min-h-[240px] lg:min-h-[300px] lg:col-span-8 lg:row-start-1">
            <Image src="/images/profile/journal.webp" alt="" fill sizes="(min-width: 1024px) 760px, 440px" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10 lg:bg-gradient-to-r rtl:lg:bg-gradient-to-l lg:from-black/85 lg:via-black/50 lg:to-transparent" />
            <div className="relative flex h-full flex-col justify-end lg:justify-center gap-3 p-5 lg:p-8 lg:max-w-[60%]">
              <p className="text-white/70 text-[11px] uppercase tracking-[0.14em]">{t('profile.selfReflection.eyebrow')}</p>
              <h2 className="font-display text-3xl lg:text-4xl text-white">{t('profile.selfReflection.title')}</h2>
              <p className="text-white/80 text-sm lg:text-base leading-relaxed">{t('profile.selfReflection.body')}</p>
              <div className="pt-1">
                <Link
                  href="/journal"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] px-5 py-2.5 text-sm text-white transition-colors"
                >
                  {t('profile.selfReflection.cta')} <span aria-hidden className="rtl:-scale-x-100">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Personalize My Space — given the most room (brief). Profile photo
              = identity; chat background = environment (a visual asset only). */}
          <Card className="p-5 lg:p-6 lg:col-span-12 lg:row-start-2">
            <h2 className="font-display text-xl lg:text-2xl text-white">{t('profile.personalize.title')}</h2>
            <p className="text-[var(--color-text-tertiary)] text-sm mt-0.5">{t('profile.personalize.subtitle')}</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-8">
              <div className="space-y-5">
                <AvatarUpload
                  avatarUrl={avatarUrl}
                  onUploaded={(url) => {
                    setAvatarUrl(url)
                    setAvatarUrlEverywhere(url) // sidebar/header/nav update without a reload
                  }}
                />
                {firstName !== null && (
                  <div>
                    <label htmlFor="account-first-name" className="block text-white/80 text-sm mb-1">{t('preferences.name')}</label>
                    <p className="text-[var(--color-text-tertiary)] text-xs mb-2">{t('preferences.nameHint')}</p>
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/80 text-sm">{t('preferences.language')}</span>
                  <LanguageSelector />
                </div>
                {/* Gender is used only to pick correct Hebrew grammar in AI replies;
                    hidden (not guessed) until the read resolves. */}
                {gender !== null && (
                  <div>
                    <p className="text-white/80 text-sm mb-1">{t('preferences.gender')}</p>
                    <p className="text-[var(--color-text-tertiary)] text-xs mb-2">{t('preferences.genderHint')}</p>
                    <GenderSelector value={gender} onChange={handleGenderChange} className={genderSaving ? 'opacity-60 pointer-events-none' : ''} />
                  </div>
                )}
              </div>
              {chatBackground !== null && (
                <div className="lg:border-s lg:border-white/8 lg:ps-8">
                  <p className="text-white/80 text-sm mb-1">{t('preferences.chatBackground')}</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mb-3">{t('preferences.chatBackgroundHint')}</p>
                  <ChatBackgroundSelector
                    value={chatBackground}
                    onChange={handleChatBackgroundChange}
                    customUrl={chatBackgroundUrl}
                    onCustomUploaded={handleCustomBackgroundUploaded}
                    className={chatBackgroundSaving ? 'opacity-60 pointer-events-none' : ''}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Compact right column: rituals + four playlists, smaller and lighter. */}
          <div className="grid gap-4 lg:gap-5 content-start lg:col-span-4 lg:col-start-9 lg:row-start-1">
            <RitualsCard />
            <PlaylistsCard />
          </div>

          {/* Account — real Credits ledger (GET /v1/credits); every account is on
              the free Beta tier today (no stored plan, nothing purchasable yet). */}
          <Card className="p-5 lg:col-span-4">
            <p className={sectionLabel}>{t('profile.settings.account')}</p>
            <div className="mt-2 divide-y divide-white/8">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-white/80 text-sm">{t('credits.label')}</p>
                  <p className="text-white text-base font-light">{credits ? credits.balance : '…'}</p>
                  {credits?.isExhausted && <p className="text-red-400/80 text-xs mt-0.5">{t('credits.outOfCredits')}</p>}
                  {credits && !credits.isExhausted && credits.isLow && (
                    <p className="text-yellow-400/80 text-xs mt-0.5">{t('credits.runningLow')}</p>
                  )}
                </div>
                <Link href="/wallet" className="text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                  {credits && (credits.isLow || credits.isExhausted) ? t('credits.upgrade') : t('credits.viewWallet')}
                </Link>
              </div>
              <div className="py-2.5">
                <p className="text-white/80 text-sm">{t('subscription.label')}</p>
                <p className="text-white text-sm font-medium mt-0.5">{t('subscription.freeBeta')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-0.5">{t('subscription.comingSoon')}</p>
              </div>
              {/* Summary for my therapist (docs/PROVIDER_SUMMARY_PLAN.md, Slice 1). */}
              <div className="py-2.5 space-y-1.5">
                <p className="text-white/80 text-sm">{t('therapistSummary.title')}</p>
                <p className="text-[var(--color-text-tertiary)] text-xs">{t('therapistSummary.body')}</p>
                <Link href="/therapist-summary" className="inline-block text-[var(--color-violet-400)] hover:text-[var(--color-violet-300)] text-xs underline">
                  {t('therapistSummary.cta')}
                </Link>
              </div>
            </div>
          </Card>

          {/* Security — signed-in password change (PUT /v1/keys re-wrap +
              Cognito changePassword), separate from forgot-password on /login. */}
          <Card className="p-5 lg:col-span-4">
            <p className={sectionLabel}>{t('security.label')}</p>
            <form onSubmit={handlePasswordChange} className="mt-3 space-y-3">
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
                className={quietButton}
              >
                {passwordChanging ? t('security.changing') : t('security.changePassword')}
              </button>
            </form>
          </Card>

          {/* Legal & Data — existing routes, the existing export (GET /v1/user/export)
              and the existing authenticated delete flow with its typed confirmation. */}
          <Card className="p-5 lg:col-span-4">
            <p className={sectionLabel}>{t('profile.settings.legalData')}</p>
            <div className="mt-2 divide-y divide-white/8">
              <Link href="/terms" className={rowLink}>
                {t('legal.terms')} <span aria-hidden className="text-white/25 rtl:-scale-x-100">›</span>
              </Link>
              <Link href="/privacy" className={rowLink}>
                {t('legal.privacy')} <span aria-hidden className="text-white/25 rtl:-scale-x-100">›</span>
              </Link>
              <div className="py-2.5">
                <button type="button" onClick={handleDownload} disabled={downloading} className="flex w-full items-center justify-between gap-3 text-sm text-white/70 hover:text-white disabled:opacity-50 transition-colors">
                  {downloading ? t('data.download.preparing') : t('data.download.title')}
                  <span aria-hidden className="text-white/25 rtl:-scale-x-100">›</span>
                </button>
                <p className="text-[var(--color-text-tertiary)] text-xs mt-1">{t('data.download.description')}</p>
              </div>
              <div className="py-2.5">
                {deleteStep === 'idle' ? (
                  <button type="button" onClick={() => setDeleteStep('confirm')} className="flex w-full items-center justify-between gap-3 text-sm text-red-300/80 hover:text-red-300 transition-colors">
                    {t('data.delete.title')} <span aria-hidden className="text-white/25 rtl:-scale-x-100">›</span>
                  </button>
                ) : (
                  <div className="space-y-3 bg-red-950/20 border border-red-900/30 rounded-2xl p-4">
                    <p className="text-red-400 text-xs font-medium">{t('data.delete.warningTitle')}</p>
                    <p className="text-[var(--color-text-tertiary)] text-xs">{t('data.delete.description')}</p>
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
              <button
                type="button"
                onClick={async () => {
                  await logOut()
                  router.push('/login')
                }}
                className={`${rowLink} w-full`}
              >
                {t('signOut')} <span aria-hidden className="text-white/25 rtl:-scale-x-100">›</span>
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
