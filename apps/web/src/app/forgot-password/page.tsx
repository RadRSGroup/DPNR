'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { forgotPassword, confirmForgotPassword, signIn } from '@/lib/cognito/client'
import { recoverAndRewrapDek, establishSessionTicket } from '@/lib/auth/keyBootstrap'
import { ApiError } from '@/lib/api/v1-client'
import RecoveryCodeReveal from '@/components/auth/RecoveryCodeReveal'
import type { RecoveryCode } from '@/lib/crypto'

/**
 * Phase 6 Stage 3 (docs/AGENT_LOG.md, ADR 0014) — net-new. Cognito's
 * password reset (`forgotPassword`/`confirmForgotPassword`) is independent
 * of this account's encryption key bundle, so a password reset alone would
 * strand a returning user's DEK wrapped under a KEK they can no longer
 * derive. This flow chains the two: reset the Cognito password, sign in
 * with it, then use the recovery code to recover the DEK and re-wrap it
 * under the new password (rotating the recovery code in the process).
 */
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [stage, setStage] = useState<'request' | 'reset' | 'recover' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryCodeInput, setRecoveryCodeInput] = useState('')
  const [rotatedCode, setRotatedCode] = useState<RecoveryCode | null>(null)
  const [noKeysMessage, setNoKeysMessage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await forgotPassword(email)
      setStage('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start password reset.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await confirmForgotPassword(email, code, newPassword)
      // Now authenticated with the new password — needed for GET /v1/keys.
      await signIn(email, newPassword)
      setStage('recover')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const newRotatedCode = await recoverAndRewrapDek(recoveryCodeInput, newPassword)
      setRotatedCode(newRotatedCode)
      setStage('done')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'keys_not_found') {
        // Nothing to recover for this account — the password reset alone is
        // the whole story.
        setNoKeysMessage(true)
        setStage('done')
        return
      }
      // Covers both a malformed code (parseRecoveryCode) and a wrong one
      // (unwrapKey's GCM tag check) — same message either way, can't
      // distinguish further by design. Cognito's password is already
      // changed at this point, so retrying here doesn't require redoing
      // the email/code step.
      setError('That recovery code doesn’t match this account. Check it and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDone() {
    setContinuing(true)
    await establishSessionTicket(newPassword).catch(() => {})
    router.push('/companion')
    router.refresh()
  }

  if (stage === 'done') {
    if (rotatedCode) {
      return (
        <RecoveryCodeReveal
          recoveryCode={rotatedCode}
          onContinue={handleDone}
          continuing={continuing}
          title="Save your new recovery code"
          subtitle="Your old recovery code no longer works. This one replaces it — the only way back in if you forget your password again."
        />
      )
    }
    return (
      <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto">✓</div>
          <h2 className="text-white text-xl font-light">Password reset</h2>
          {noKeysMessage && (
            <p className="text-white/50 text-sm px-4">Your password has been changed. You can sign in now.</p>
          )}
          <button
            onClick={handleDone}
            disabled={continuing}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98] mt-4"
          >
            {continuing ? 'Continuing…' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 flex flex-col justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="mb-10 text-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
        <h1 className="text-white text-2xl font-light">
          {stage === 'request' && 'Reset your password'}
          {stage === 'reset' && 'Check your email'}
          {stage === 'recover' && 'Enter your recovery code'}
        </h1>
        <p className="text-white/40 text-sm mt-2">
          {stage === 'request' && "We'll send a code to your email."}
          {stage === 'reset' && (
            <>
              Enter the code sent to <span className="text-white/80">{email}</span> and choose a new password.
            </>
          )}
          {stage === 'recover' &&
            "Your password is changed. Now enter your recovery code so we can restore access to your encrypted data."}
        </p>
      </div>

      {error && (
        <div className="mb-5 bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {stage === 'request' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      )}

      {stage === 'reset' && (
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Confirmation code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm text-center tracking-[0.3em] focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <input
            type="password"
            placeholder="New password (min. 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      )}

      {stage === 'recover' && (
        <form onSubmit={handleRecover} className="space-y-4">
          <input
            type="text"
            placeholder="ABCD-EFGH-JKMN-..."
            value={recoveryCodeInput}
            onChange={(e) => setRecoveryCodeInput(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 text-sm text-center tracking-widest font-mono focus:outline-none focus:border-purple-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl px-5 py-4 font-medium transition-all active:scale-[0.98]"
          >
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
        </form>
      )}

      <p className="text-center text-white/30 text-sm mt-8">
        <Link href="/login" className="text-purple-400 hover:text-purple-300">Back to sign in</Link>
      </p>
    </div>
  )
}
