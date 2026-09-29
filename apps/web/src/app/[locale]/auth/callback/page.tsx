'use client'
import Image from 'next/image'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { adoptOAuthSession } from '@/lib/cognito/client'
import {
  completeGoogleSignIn,
  OAuthCallbackError,
  peekPendingSignIn,
  shouldRetryAfterLink,
  startGoogleSignIn,
} from '@/lib/cognito/oauth'
import { bootstrapKeysAtSignup, establishSessionTicket, recoverAndRewrapDek } from '@/lib/auth/keyBootstrap'
import { ApiError, getUserKeys, updatePreferences } from '@/lib/api/v1-client'
import { savedLocale } from '@/lib/saved-locale'
import { touchVisit } from '@/lib/visit'
import { resolveSafeNext } from '@/lib/navigation/safeNext'
import type { RecoveryCode } from '@/lib/crypto'
import RecoveryCodeReveal from '@/components/auth/RecoveryCodeReveal'

type Stage =
  | { kind: 'working' }
  | { kind: 'create' }
  | { kind: 'reveal'; code: RecoveryCode }
  | { kind: 'unlock' }
  | { kind: 'recover' }
  | { kind: 'reveal-rotated'; code: RecoveryCode }
  | { kind: 'error'; message: string }

const MIN_PASSWORD = 8

/**
 * Google sign-in landing (Session 83). Exchanges Cognito's code for tokens,
 * then asks for the DPNR password that protects the person's keys (user
 * decision: "password after Google"): a new account creates one and gets
 * its recovery code; an existing one (including an email/password account
 * linked by pre-signup.ts) enters it to unlock. The password never leaves
 * the browser; it only derives the key-wrapping key (lib/auth/keyBootstrap).
 */
function CallbackFlow() {
  const t = useTranslations('GoogleAuth')
  const router = useRouter()
  const params = useSearchParams()
  const [stage, setStage] = useState<Stage>({ kind: 'working' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const dest = useRef<{ next: string; locale: 'en' | 'he'; isNew: boolean }>({ next: '/companion', locale: 'en', isNew: false })
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      try {
        const result = await completeGoogleSignIn(new URLSearchParams(params.toString()))
        adoptOAuthSession(result.tokens)
        dest.current = { next: resolveSafeNext(result.next), locale: result.locale, isNew: false }
        try {
          await getUserKeys()
          setStage({ kind: 'unlock' })
        } catch (err) {
          if (err instanceof ApiError && err.code === 'keys_not_found') {
            dest.current.isNew = true
            setStage({ kind: 'create' })
          } else {
            throw err
          }
        }
      } catch (err) {
        if (err instanceof OAuthCallbackError && shouldRetryAfterLink(params.get('error_description'))) {
          const pending = peekPendingSignIn()
          await startGoogleSignIn(pending?.next ?? '/companion', pending?.locale ?? 'en')
          return
        }
        const message =
          err instanceof OAuthCallbackError && err.code === 'cancelled' ? t('cancelled') : t('genericError')
        setStage({ kind: 'error', message })
      }
    })()
  }, [params, t])

  async function finish() {
    const { next, locale, isNew } = dest.current
    if (isNew) await updatePreferences({ preferredLanguage: locale }).catch(() => {})
    // New accounts go through consent / profile setup; proxy.ts routes them.
    // Existing ones open in their saved language (this also sets the
    // domain's locale cookie; see lib/saved-locale.ts).
    // An existing account starting a new visit goes to Main Chat (lib/visit.ts).
    if (isNew) router.push('/consent', { locale })
    else router.push(touchVisit().isNew ? '/companion' : next, { locale: await savedLocale(locale) })
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (password.length < MIN_PASSWORD) return setFormError(t('tooShort'))
    if (password !== confirm) return setFormError(t('mismatch'))
    setBusy(true)
    try {
      const code = await bootstrapKeysAtSignup(password)
      if (code) {
        setStage({ kind: 'reveal', code })
      } else {
        // A bundle already existed (a retried create) — unlock instead.
        setStage({ kind: 'unlock' })
      }
    } catch {
      setFormError(t('genericError'))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      await establishSessionTicket(password)
      await finish()
    } catch {
      setFormError(t('wrongPassword'))
      setBusy(false)
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (password.length < MIN_PASSWORD) return setFormError(t('tooShort'))
    setBusy(true)
    try {
      const code = await recoverAndRewrapDek(recoveryCode, password)
      setStage({ kind: 'reveal-rotated', code })
    } catch {
      setFormError(t('badCode'))
    } finally {
      setBusy(false)
    }
  }

  async function continueAfterReveal() {
    setBusy(true)
    await establishSessionTicket(password).catch(() => {})
    await finish()
  }

  if (stage.kind === 'reveal' || stage.kind === 'reveal-rotated') {
    return <RecoveryCodeReveal recoveryCode={stage.code} onContinue={continueAfterReveal} continuing={busy} />
  }

  const input =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors'
  const label = 'block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5'
  const button =
    'w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]'

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
      <div className="max-w-[393px] mx-auto px-5 min-h-screen flex flex-col justify-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2 text-center">DPNR</p>

        {stage.kind === 'working' && (
          <p className="text-center text-white/80 text-sm" role="status">{t('signingIn')}</p>
        )}

        {stage.kind === 'error' && (
          <div className="text-center">
            <h1 className="text-white text-xl font-light mb-3">{t('errorTitle')}</h1>
            <p className="text-[var(--color-text-tertiary)] text-sm mb-6">{stage.message}</p>
            <Link href="/login" className="text-purple-400 hover:text-purple-300 text-sm">{t('backToLogin')}</Link>
          </div>
        )}

        {(stage.kind === 'create' || stage.kind === 'unlock' || stage.kind === 'recover') && (
          <>
            <h1 className="text-white text-2xl font-light text-center mb-2">
              {stage.kind === 'create' ? t('createTitle') : stage.kind === 'unlock' ? t('unlockTitle') : t('recoverTitle')}
            </h1>
            <p className="text-[var(--color-text-tertiary)] text-sm text-center mb-8">
              {stage.kind === 'create' ? t('createBody') : stage.kind === 'unlock' ? t('unlockBody') : t('recoverBody')}
            </p>

            {formError && (
              <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3" role="alert">
                <p className="text-red-400 text-sm">{formError}</p>
              </div>
            )}

            <form
              onSubmit={stage.kind === 'create' ? handleCreate : stage.kind === 'unlock' ? handleUnlock : handleRecover}
              className="space-y-4"
            >
              {stage.kind === 'recover' && (
                <div>
                  <label htmlFor="g-recovery" className={label}>{t('recoveryCode')}</label>
                  <input id="g-recovery" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required autoComplete="off" className={input} />
                </div>
              )}
              <div>
                <label htmlFor="g-password" className={label}>
                  {stage.kind === 'recover' ? t('newPassword') : t('password')}
                </label>
                <input
                  id="g-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={stage.kind === 'unlock' ? 'current-password' : 'new-password'}
                  className={input}
                />
              </div>
              {stage.kind === 'create' && (
                <div>
                  <label htmlFor="g-confirm" className={label}>{t('confirmPassword')}</label>
                  <input id="g-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={input} />
                </div>
              )}
              <button type="submit" disabled={busy} className={button}>
                {stage.kind === 'create' ? t('createCta') : stage.kind === 'unlock' ? (busy ? t('unlocking') : t('unlockCta')) : t('recoverCta')}
              </button>
            </form>

            {stage.kind === 'unlock' && (
              <button
                type="button"
                onClick={() => { setFormError(null); setPassword(''); setStage({ kind: 'recover' }) }}
                className="block mx-auto mt-6 text-[var(--color-text-tertiary)] text-xs hover:text-white/60 transition-colors"
              >
                {t('forgot')}
              </button>
            )}
            {stage.kind === 'recover' && (
              <button
                type="button"
                onClick={() => { setFormError(null); setStage({ kind: 'unlock' }) }}
                className="block mx-auto mt-6 text-[var(--color-text-tertiary)] text-xs hover:text-white/60 transition-colors"
              >
                {t('backToUnlock')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <CallbackFlow />
    </Suspense>
  )
}
