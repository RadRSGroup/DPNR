import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

// Same rich-text-per-section convention as terms/page.tsx — see that file's
// doc comment for why (one translatable block per section, not fragment
// keys per paragraph).
const RICH_TAGS = {
  p: (chunks: ReactNode) => <p>{chunks}</p>,
  ul: (chunks: ReactNode) => <ul>{chunks}</ul>,
  li: (chunks: ReactNode) => <li>{chunks}</li>,
  strong: (chunks: ReactNode) => <strong className="text-white/90">{chunks}</strong>,
  privacyEmail: () => <span className="text-purple-400">privacy@dpnr.app</span>,
}

const SECTION_IDS = [
  'whatWeCollect', 'anonymisedAnalysis', 'aiProcessing', 'dataSharing',
  'dataRetention', 'yourRights', 'security', 'cookies', 'changes',
] as const

const TABLE_ROW_IDS = ['aiFeatures', 'storeContent', 'payments', 'anonymisedImprove', 'aggregateReporting', 'transactionalEmail'] as const

export default async function PrivacyPage() {
  const t = await getTranslations('Privacy')
  // Same session-aware back-link fix as /terms — a logged-in user reaching
  // this page (e.g. from /account) should return there, not to /signup.
  const hasSession = (await cookies()).get('dpnr_session')?.value === '1'
  const backHref = hasSession ? '/account' : '/signup'

  return (
    <div className="relative min-h-screen max-w-[680px] mx-auto px-5 pb-20">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="pt-14 pb-8">
        <Link href={backHref} className="text-purple-400 text-sm">{t('back')}</Link>
        <p className="text-purple-400 text-xs tracking-widest uppercase mt-6 mb-2">DPNR · InnerOS</p>
        <h1 className="text-white text-2xl font-light">{t('title')}</h1>
        <p className="text-[var(--color-text-tertiary)] text-xs mt-2">{t('effectiveDate')}</p>
      </div>

      <div className="space-y-8 text-white/70 text-sm leading-relaxed">

        <Section title={t('sections.whatWeCollect.title')}>
          {t.rich('sections.whatWeCollect.body', RICH_TAGS)}
        </Section>

        <Section title={t('usageTable.title')}>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-start py-2 pe-4 text-white/50 font-medium">{t('usageTable.purposeHeader')}</th>
                <th className="text-start py-2 text-white/50 font-medium">{t('usageTable.legalBasisHeader')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TABLE_ROW_IDS.map((id) => (
                <tr key={id}>
                  <td className="py-2 pe-4 text-white/60">{t(`usageTable.rows.${id}.purpose`)}</td>
                  <td className="py-2 text-[var(--color-text-tertiary)]">{t(`usageTable.rows.${id}.basis`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {SECTION_IDS.slice(1).map((id) => (
          <Section key={id} title={t(`sections.${id}.title`)}>
            {t.rich(`sections.${id}.body`, RICH_TAGS)}
          </Section>
        ))}

        <div className="pt-4 border-t border-white/10">
          <p className="text-[var(--color-text-tertiary)] text-xs">
            {t.rich('dataController', {
              email: () => <span className="text-purple-400">privacy@dpnr.app</span>,
            })}
          </p>
          <div className="flex gap-4 mt-3">
            <Link href="/terms" className="text-purple-400 text-xs hover:text-purple-300">{t('termsLink')}</Link>
            <Link href="/account" className="text-purple-400 text-xs hover:text-purple-300">{t('accountLink')}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-white text-base font-medium">{title}</h2>
      <div className="space-y-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:space-y-1.5 [&_li]:text-white/70">{children}</div>
    </div>
  )
}
