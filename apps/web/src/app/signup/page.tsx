'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, confirmSignUp, resendConfirmationCode, signIn } from '@/lib/cognito/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  // Cognito's autoVerify: { email: true } (auth-stack.ts) means signup needs
  // a confirmation code, not the old magic-link email — a real UX
  // difference from the Supabase-era flow, not a bug.
  const [stage, setStage] = useState<'form' | 'confirm'>('form')
  const [consented, setConsented] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!consented) {
      setError('Please accept the Terms of Use and Privacy Policy to continue.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await signUp(email, password)
      setStage('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.')
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
      router.push('/consent')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    try {
      await resendConfirmationCode(email)
      setResent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.')
    }
  }

  if (stage === 'confirm') {
    return (
      <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="text-center space-y-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto">✦</div>
          <h2 className="text-white text-xl font-light">Check your email</h2>
          <p className="text-white/50 text-sm">We sent a 6-digit code to <span className="text-white/80">{email}</span>.</p>
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
            placeholder="Confirmation code"
            value={code}
            onChange={e => setCode(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm text-center tracking-[0.3em] focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? 'Confirming…' : 'Confirm & continue'}
          </button>
        </form>

        <button onClick={handleResend} disabled={resent} className="text-purple-400 text-sm hover:text-purple-300 mt-6 disabled:opacity-50">
          {resent ? 'Code resent — check your email' : "Didn't get a code? Resend"}
        </button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="mb-10 text-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
        <div className="relative inline-block">
          <h1 className="text-white text-2xl font-light">InnerOS</h1>
          <span className="absolute top-1/2 left-full -translate-y-1/2 ml-2 text-[10px] font-semibold tracking-widest uppercase text-yellow-400 border border-yellow-400/40 rounded-full px-2 py-0.5 whitespace-nowrap">Beta</span>
        </div>
        <p className="text-white/40 text-sm mt-2">Create your free account</p>
      </div>

      {error && (
        <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
        />
        <input
          type="password"
          placeholder="Password (min. 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
        />
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
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">Terms of Use</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" className="text-purple-400 hover:text-purple-300 underline">Privacy & Data Policy</Link>
            , including the use of my anonymised data to improve the service.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !consented}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-white/30 text-sm mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
      </p>
    </div>
  )
}
