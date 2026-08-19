'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { grantConsent } from '@/lib/api/v1-client'
import { markConsentedLocally } from '@/lib/cognito/client'

const POINTS = [
  {
    icon: '🔒',
    title: 'Your decisions stay yours',
    body: 'Everything you write is private. We never share your personal content with third parties.',
  },
  {
    icon: '✦',
    title: 'AI processes your content',
    body: 'Your decision text is sent to OpenAI to generate reflections. OpenAI does not use API inputs to train their models by default.',
  },
  {
    icon: '📊',
    title: 'Anonymised analysis',
    body: 'We may analyse anonymised, aggregated usage patterns to improve the product. No individual content is read or attributed.',
  },
  {
    icon: '⬇',
    title: 'Download or delete anytime',
    body: 'You can export all your data as JSON or permanently delete your account from Account Settings at any time.',
  },
]

function ConsentContent() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/dashboard'

  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    try {
      await grantConsent()
      markConsentedLocally()
      router.push(next)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10 flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-16 pb-6 text-center">
        <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-4">✦</div>
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR · Decision Room</p>
        <h1 className="text-white text-xl font-light">Before you begin</h1>
        <p className="text-white/40 text-sm mt-2">Please review how we handle your data.</p>
      </div>

      <div className="flex-1 space-y-3">
        {POINTS.map(p => (
          <div key={p.title} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3">
            <span className="text-lg flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <p className="text-white/90 text-sm font-medium">{p.title}</p>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{p.body}</p>
            </div>
          </div>
        ))}

        <p className="text-white/30 text-xs text-center px-2 leading-relaxed">
          By continuing you agree to our{' '}
          <Link href="/terms" target="_blank" className="text-purple-400 underline">Terms of Use</Link>
          {' '}and{' '}
          <Link href="/privacy" target="_blank" className="text-purple-400 underline">Privacy & Data Policy</Link>
          , including the use of anonymised data to improve the service.
        </p>

        {error && (
          <div className="bg-red-900/30 border border-red-700/40 rounded-2xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 active:scale-[0.98] text-white rounded-2xl px-5 py-4 font-medium transition-all"
        >
          {accepting ? 'Saving…' : 'I agree — take me in'}
        </button>

        <p className="text-white/20 text-xs text-center">
          You can withdraw consent and delete your account at any time from{' '}
          <Link href="/account" className="text-purple-400/60 underline">Account Settings</Link>.
        </p>
      </div>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <ConsentContent />
    </Suspense>
  )
}
