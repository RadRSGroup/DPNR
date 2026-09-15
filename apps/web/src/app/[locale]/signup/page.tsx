'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { signUp, confirmSignUp, resendConfirmationCode, signIn } from '@/lib/cognito/client'
import { bootstrapKeysAtSignup, establishSessionTicket } from '@/lib/auth/keyBootstrap'
import { updatePreferences } from '@/lib/api/v1-client'
import RecoveryCodeReveal from '@/components/auth/RecoveryCodeReveal'
import PasswordCreationField, { passwordsReadyToSubmit } from '@/components/auth/PasswordCreationField'
import type { RecoveryCode } from '@/lib/crypto'

export default function SignupPage() {
  const t = useTranslations('Signup')
  const router = useRouter()
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  // Cognito's autoVerify: { email: true } (auth-stack.ts) means signup needs
  // a confirmation code, not the old magic-link email — a real UX
  // difference from the Supabase-era flow, not a bug.
  // 'recovery-code' is Phase 6 Stage 3's mandatory one-time reveal (ADR 0001).
  const [stage, setStage] = useState<'form' | 'confirm' | 'recovery-code'>('form')
  const [consented, setConsented] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<RecoveryCode | null>(null)
  const [continuing, setContinuing] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordsReadyToSubmit(password, confirmPassword)) {
      setError(t('errorPasswordRequirements'))
      return
    }
    if (!consented) {
      setError(t('errorConsentRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await signUp(email, password)
      setStage('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSignUpFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await confirmSignUp(email, code)
      // Sign in immediately so the guided flow can continue without a
      // second manual step — same net effect as the old flow's magic-link
      // click landing the user back in the app already authenticated.
      await signIn(email, password)
      // The post-confirmation trigger always creates the profile with an
      // `en` default, regardless of which locale this page was viewed in —
      // write the real value now, while there's a fresh session to
      // authenticate with. Best-effort: a failed write here isn't worth
      // blocking or erroring the whole signup flow over, same tolerance
      // establishSessionTicket below already uses. Gender is no longer
      // asked here — Session 51 moved it to the dedicated post-signin
      // /profile-setup screen (proxy.ts's gate, right after consent).
      await updatePreferences({ preferredLanguage: locale as 'en' | 'he' }).catch(() => {})
      // Phase 6 Stage 3: generate this account's real key bundle now, while
      // the password is still in scope. `null` means a bundle already
      // existed (a retried confirm after an earlier attempt already
      // succeeded and already showed the real code) — there's nothing new
      // to reveal, so skip straight past the recovery-code stage rather
      // than fabricate one.
      const newRecoveryCode = await bootstrapKeysAtSignup(password)
      if (newRecoveryCode) {
        setRecoveryCode(newRecoveryCode)
        setStage('recovery-code')
        setLoading(false)
        return
      }
      await establishSessionTicket(password).catch(() => {})
      router.push('/consent')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorInvalidCode'))
      setLoading(false)
    }
  }

  async function handleRecoveryCodeContinue() {
    setContinuing(true)
    await establishSessionTicket(password).catch(() => {})
    router.push('/consent')
    router.refresh()
  }

  async function handleResend() {
    setError(null)
    try {
      await resendConfirmationCode(email)
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorResendFailed'))
    }
  }

  if (stage === 'recovery-code' && recoveryCode) {
    return (
      <RecoveryCodeReveal recoveryCode={recoveryCode} onContinue={handleRecoveryCodeContinue} continuing={continuing} />
    )
  }

  if (stage === 'confirm') {
    // Same full-bleed-background/narrow-column split as the 'form' stage
    // below and login/page.tsx — see that file's doc comment for why.
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 -z-10">
          <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
        </div>

        <div className="max-w-[393px] mx-auto px-5 min-h-screen flex flex-col justify-center">
          <div className="text-center space-y-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto">✦</div>
            <h2 className="text-white text-xl font-light">{t('checkEmail')}</h2>
            <p className="text-white/50 text-sm">{t('codeSentTo')} <span className="text-white/80">{email}</span>.</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleConfirm} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              placeholder={t('confirmationCodePlaceholder')}
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm text-center tracking-[0.3em] focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
            >
              {loading ? t('confirming') : t('confirmAndContinue')}
            </button>
          </form>

          <button onClick={handleResend} disabled={resent} className="text-purple-400 text-sm hover:text-purple-300 mt-6 disabled:opacity-50">
            {resent ? t('codeResent') : t('resendCode')}
          </button>
        </div>
      </div>
    )
  }

  return (
    // Full-bleed background wrapper + narrow content column, same split as
    // the 'confirm' stage above and login/page.tsx — see that file's doc
    // comment for why this can't just be an `lg:` class on one div.
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 min-h-screen flex flex-col justify-center">
        <div className="mb-10 text-center">
          <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
          <div className="relative inline-block">
            <h1 className="text-white text-2xl font-light">InnerOS</h1>
            <span className="absolute top-1/2 start-full -translate-y-1/2 ms-2 text-[10px] font-semibold tracking-widest uppercase text-yellow-400 border border-yellow-400/40 rounded-full px-2 py-0.5 whitespace-nowrap">{t('beta')}</span>
          </div>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {t('email')}
            </label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {t('password')}
            </label>
            <PasswordCreationField
              password={password}
              onPasswordChange={setPassword}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={setConfirmPassword}
            />
          </div>
          {/* Consent */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setConsented(v => !v)}
              className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                consented ? 'bg-purple-600 border-purple-500' : 'border-white/20 group-hover:border-white/40'
              }`}
            >
              {consented && <span className="text-white text-xs leading-none">✓</span>}
            </div>
            <span className="text-white/50 text-xs leading-relaxed">
              {t.rich('consentText', {
                terms: (chunks) => (
                  <Link href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">{chunks}</Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" target="_blank" className="text-purple-400 hover:text-purple-300 underline">{chunks}</Link>
                ),
              })}
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !consented || !passwordsReadyToSubmit(password, confirmPassword)}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? t('creatingAccount') : t('createAccount')}
          </button>
        </form>

        <p className="text-center text-[var(--color-text-tertiary)] text-sm mt-8">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">{t('signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
