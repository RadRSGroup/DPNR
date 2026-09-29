'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { startGoogleSignIn } from '@/lib/cognito/oauth'

/** Google's four-colour "G", as its sign-in branding guidelines require. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** "Continue with Google" plus an "or" divider; used above the email forms on /login and /signup. */
export default function GoogleSignInButton({ next = '/companion' }: { next?: string }) {
  const t = useTranslations('GoogleAuth')
  const locale = useLocale() as 'en' | 'he'
  const [starting, setStarting] = useState(false)

  return (
    <>
      <button
        type="button"
        disabled={starting}
        onClick={() => {
          setStarting(true)
          startGoogleSignIn(next, locale).catch(() => setStarting(false))
        }}
        className="w-full flex items-center justify-center gap-3 bg-white text-[#1f1f1f] rounded-2xl px-5 py-3.5 text-sm font-medium hover:bg-white/90 disabled:opacity-60 transition-all active:scale-[0.98]"
      >
        <GoogleMark />
        {t('continueWithGoogle')}
      </button>
      <div className="flex items-center gap-3 my-6" aria-hidden>
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide">{t('or')}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </>
  )
}
