'use client'
import { useState } from 'react'

/**
 * Mirrors Cognito's actual pool policy (`infra/cdk/lib/auth-stack.ts`'s
 * `passwordPolicy`: minLength 8, require lower/upper/digit, no symbol
 * required) — shown here so a user finds out *before* submitting, not from
 * a generic Cognito rejection message after the fact.
 */
const REQUIREMENTS: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
]

export function isPasswordValid(password: string): boolean {
  return REQUIREMENTS.every((r) => r.test(password))
}

export function passwordsReadyToSubmit(password: string, confirmPassword: string): boolean {
  return isPasswordValid(password) && password === confirmPassword
}

interface Props {
  password: string
  onPasswordChange: (value: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (value: string) => void
  passwordPlaceholder?: string
  confirmPlaceholder?: string
  /** 'new-password' (default) vs. 'current-password' — callers that already
      have their own "current password" field pass this for the new one. */
  autoComplete?: string
}

/**
 * Shared "create/change password" input pair — a password field with a
 * live requirements checklist (so a rejected requirement is visible while
 * typing, not just after a failed submit) plus a confirm field with a live
 * match/mismatch indicator. Used anywhere a *new* password is being set:
 * signup, forgot-password's reset step, and account settings' change-
 * password form — those three had each grown their own ad-hoc "8
 * characters, matches on submit" check with no visible requirements list;
 * this replaces all three with one component and one validity rule
 * (`passwordsReadyToSubmit`) so a caller's submit button can gate on it
 * directly instead of re-deriving the same checks per page.
 */
export default function PasswordCreationField({
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  passwordPlaceholder = 'Password',
  confirmPlaceholder = 'Confirm password',
  autoComplete = 'new-password',
}: Props) {
  const [touched, setTouched] = useState(false)
  const showChecklist = touched || password.length > 0
  const showConfirmState = confirmPassword.length > 0
  const matches = showConfirmState && password === confirmPassword
  const mismatch = showConfirmState && password !== confirmPassword

  return (
    <div className="space-y-3">
      <div>
        <input
          type="password"
          placeholder={passwordPlaceholder}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onFocus={() => setTouched(true)}
          required
          autoComplete={autoComplete}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
        />
        {showChecklist && (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 px-1">
            {REQUIREMENTS.map((req) => {
              const met = req.test(password)
              return (
                <li
                  key={req.label}
                  className={`text-xs flex items-center gap-1.5 transition-colors ${
                    met ? 'text-green-400/80' : 'text-[var(--color-text-tertiary)]'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px] leading-none transition-colors ${
                      met ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {met ? '✓' : ''}
                  </span>
                  {req.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <input
          type="password"
          placeholder={confirmPlaceholder}
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
          autoComplete={autoComplete}
          className={`w-full bg-white/5 border rounded-2xl px-4 py-3.5 text-white placeholder-[var(--color-text-tertiary)] text-sm focus:outline-none transition-colors ${
            mismatch
              ? 'border-red-500/50 focus:border-red-500/60'
              : matches
                ? 'border-green-500/40 focus:border-green-500/60'
                : 'border-white/10 focus:border-purple-500/60'
          }`}
        />
        {mismatch && <p className="text-red-400 text-xs mt-1.5 px-1">Passwords do not match.</p>}
        {matches && <p className="text-green-400/80 text-xs mt-1.5 px-1">Passwords match.</p>}
      </div>
    </div>
  )
}
