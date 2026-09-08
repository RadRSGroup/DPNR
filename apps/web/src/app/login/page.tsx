'use client'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { signIn } from '@/lib/cognito/client'
import { establishSessionTicket } from '@/lib/auth/keyBootstrap'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/companion' // default post-login landing — see proxy.ts's doc comment
  const callbackError = params.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(callbackError ? 'Authentication failed. Please try again.' : null)

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
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="mb-10 text-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
        <h1 className="text-white text-2xl font-light">InnerOS</h1>
        <p className="text-[var(--color-text-tertiary)] text-sm mt-2">Sign in to continue</p>
      </div>

      {error && (
        <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1.5">
            Email
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
            Password
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
          <div className="text-right mt-2">
            <Link href="/forgot-password" className="text-[var(--color-text-tertiary)] text-xs hover:text-white/50 transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-[var(--color-text-tertiary)] text-sm mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-purple-400 hover:text-purple-300">Sign up</Link>
      </p>
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
