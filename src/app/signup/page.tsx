'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
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
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setConfirmed(true)
    }
  }

  async function handleGoogleSignup() {
    if (!consented) {
      setError('Please accept the Terms of Use and Privacy Policy to continue.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // consent=1 tells the auth callback to record consent immediately
      options: { redirectTo: `${window.location.origin}/auth/callback?consent=1` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto">✦</div>
          <h2 className="text-white text-xl font-light">Check your email</h2>
          <p className="text-white/50 text-sm">We sent a confirmation link to <span className="text-white/80">{email}</span>. Click it to activate your account.</p>
          <button onClick={() => router.push('/login')} className="text-purple-400 text-sm hover:text-purple-300">Back to sign in</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="mb-10 text-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
        <h1 className="text-white text-2xl font-light">Decision Room</h1>
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

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0d0818] px-3 text-white/30 text-xs">or</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full bg-white/5 border border-white/10 hover:border-white/20 disabled:opacity-50 text-white rounded-2xl px-5 py-4 text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-white/30 text-sm mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
      </p>
    </div>
  )
}
