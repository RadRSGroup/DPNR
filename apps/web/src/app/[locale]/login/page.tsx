'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { signIn } from '@/lib/cognito/client'
import { establishSessionTicket } from '@/lib/auth/keyBootstrap'
import { resolveSafeNext } from '@/lib/navigation/safeNext'

function LoginForm() {
  const t = useTranslations('Login')
  const router = useRouter()
  const params = useSearchParams()
  // Untrusted until validated — see resolveSafeNext's own doc comment (DPNR-03).
  const next = resolveSafeNext(params.get('next'))
  const callbackError = params.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(callbackError ? t('authFailed') : null)

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      // Best-effort — a failure here must never block a successful sign-in;
      // nothing consumes session tickets server-side until Stage 4.
      await establishSessionTicket(password).catch(() => {})
      router.push(next)
      router.refresh()
    } catch (err) {
      // err.message comes straight from the Cognito SDK and is English-only
      // regardless of locale — mapping every Cognito error code to a
      // localized message is real future work, not attempted here (Slice D
      // only localizes this app's own static strings). Only the fallback
      // (no message at all) is localized.
      setError(err instanceof Error ? err.message : t('signInFailed'))
      setLoading(false)
    }
  }

  return (
    // The background used to be nested inside the max-w-[393px] column
    // itself, so it was clipped to that width on desktop too, not just the
    // form — a bare `lg:` class on that one div couldn't fix it, since the
    // clipping div and the content div were the same element. Split into a
    // full-bleed outer wrapper (background) and a narrow inner column
    // (content), same convention DecisionRoomLanding.tsx/MirrorRoomLanding.tsx
    // already use. The form itself deliberately stays narrow at every width
    // — a login form shouldn't stretch edge-to-edge on a desktop viewport —
    // only the atmosphere behind it should fill the screen.
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 min-h-screen flex flex-col justify-center">
        <div className="mb-10 text-center">
          <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
          <h1 className="text-white text-2xl font-light">Your Human Operating System</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
        </div>

        {error && (
          <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {t('email')}
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
              {t('password')}
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            <div className="text-end mt-2">
              <Link href="/forgot-password" className="text-[var(--color-text-tertiary)] text-xs hover:text-white/50 transition-colors">
                {t('forgotPassword')}
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <p className="text-center text-[var(--color-text-tertiary)] text-sm mt-8">
          {t('noAccount')}{' '}
          <Link href="/signup" className="text-purple-400 hover:text-purple-300">{t('signUp')}</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <LoginForm />
    </Suspense>
  )
}
