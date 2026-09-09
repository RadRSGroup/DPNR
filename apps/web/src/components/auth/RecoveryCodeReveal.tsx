'use client'
import Image from 'next/image'
import { useState } from 'react'
import type { RecoveryCode } from '@/lib/crypto'
import Card from '@/components/ui/Card'

interface RecoveryCodeRevealProps {
  recoveryCode: RecoveryCode
  onContinue: () => void
  continuing: boolean
  error?: string | null
  title?: string
  subtitle?: string
}

/**
 * The mandatory one-time recovery-code reveal (ADR 0001 — "not optional
 * polish": shown once, gated behind an explicit "if I lose this, my data is
 * unrecoverable" acknowledgment, not a soft dismiss). Shared between signup
 * (the first code) and the forgot-password recovery flow (a rotated code,
 * per the project's recovery-rotation decision — ADR 0014) so the copy and
 * ack behavior can't drift between the two places it's shown.
 */
export default function RecoveryCodeReveal({
  recoveryCode,
  onContinue,
  continuing,
  error,
  title = 'Save your recovery code',
  subtitle = "This is the only way back into your account if you forget your password. We can't recover it for you — we never see your password or your data.",
}: RecoveryCodeRevealProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    // Full-bleed background wrapper + narrow content column — same split as
    // login/page.tsx and signup/page.tsx (which this screen is a step of).
    // See login/page.tsx's doc comment for why the background can't just be
    // nested inside the narrow column with an `lg:` class added.
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="max-w-[393px] mx-auto px-5 pb-10 min-h-screen flex flex-col">
        <div className="pt-16 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-4">🔑</div>
          <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR</p>
          <h1 className="text-white text-xl font-light">{title}</h1>
          <p className="text-[var(--color-text-tertiary)] text-sm mt-2 leading-relaxed">{subtitle}</p>
        </div>

        <div className="flex-1 space-y-4">
          <Card className="!p-5">
            <p className="text-white font-mono text-base tracking-wide text-center break-all select-all">
              {recoveryCode.display}
            </p>
          </Card>

          <p className="text-[var(--color-text-tertiary)] text-xs text-center px-2 leading-relaxed">
            Write it down or save it in a password manager — not just a screenshot you might lose.
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              onClick={() => setAcknowledged((v) => !v)}
              className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                acknowledged ? 'bg-purple-600 border-purple-500' : 'border-white/20 group-hover:border-white/40'
              }`}
            >
              {acknowledged && <span className="text-white text-xs leading-none">✓</span>}
            </div>
            <span className="text-white/50 text-xs leading-relaxed">
              I&apos;ve saved this code somewhere safe. If I lose both my password and this code, my data is
              permanently unrecoverable.
            </span>
          </label>

          <button
            onClick={onContinue}
            disabled={!acknowledged || continuing}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all"
          >
            {continuing ? 'Continuing…' : "I've saved it — continue"}
          </button>
        </div>
      </div>
    </div>
  )
}
