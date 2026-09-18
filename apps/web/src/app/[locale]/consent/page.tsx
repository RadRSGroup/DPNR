'use client'
import Image from 'next/image'
import { useState, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { grantConsent } from '@/lib/api/v1-client'
import { markConsentedLocally } from '@/lib/cognito/client'
import { resolveSafeNext } from '@/lib/navigation/safeNext'
import Card from '@/components/ui/Card'

const POINTS = [
  { id: 'decisionsStayYours', icon: '🔒' },
  { id: 'aiProcessesContent', icon: '🧠' },
  { id: 'anonymisedAnalysis', icon: '📊' },
  { id: 'downloadOrDelete', icon: '⬇' },
] as const

function ConsentContent() {
  const t = useTranslations('Consent')
  const router = useRouter()
  const params = useSearchParams()
  // Untrusted until validated — see resolveSafeNext's own doc comment (DPNR-03).
  const next = resolveSafeNext(params.get('next'))

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
      setError(t('errorGeneric'))
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10 flex flex-col">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="pt-16 pb-6 text-center">
        <p className="text-purple-400 text-xs tracking-widest uppercase mb-2">DPNR · InnerOS</p>
        <h1 className="text-white text-xl font-light">{t('title')}</h1>
        <p className="text-[var(--color-text-tertiary)] text-sm mt-2">{t('subtitle')}</p>
      </div>

      <div className="flex-1 space-y-3">
        {POINTS.map(p => (
          <Card key={p.id} className="flex gap-3">
            <span className="text-lg flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <p className="text-white/90 text-sm font-medium">{t(`points.${p.id}.title`)}</p>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{t(`points.${p.id}.body`)}</p>
            </div>
          </Card>
        ))}

        <p className="text-[var(--color-text-tertiary)] text-xs text-center px-2 leading-relaxed">
          {t.rich('agreementText', {
            terms: (chunks) => (
              <Link href="/terms" target="_blank" className="text-purple-400 underline">{chunks}</Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank" className="text-purple-400 underline">{chunks}</Link>
            ),
          })}
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
          {accepting ? t('saving') : t('agreeButton')}
        </button>

        <p className="text-white/20 text-xs text-center">
          {t.rich('withdrawText', {
            account: (chunks) => (
              <Link href="/account" className="text-purple-400/60 underline">{chunks}</Link>
            ),
          })}
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
