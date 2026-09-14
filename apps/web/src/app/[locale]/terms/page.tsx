import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

// Rich-text tag renderers shared by every section body below — each
// section's translated value is one block of text containing <p>/<ul>/<li>/
// <strong> tags (not separate keys per paragraph), so a translator/reviewer
// can work with one coherent block per section instead of dozens of
// fragment keys, and paragraph/list structure travels with the translation
// instead of being re-assembled from parts in code.
const RICH_TAGS = {
  p: (chunks: ReactNode) => <p>{chunks}</p>,
  ul: (chunks: ReactNode) => <ul>{chunks}</ul>,
  li: (chunks: ReactNode) => <li>{chunks}</li>,
  strong: (chunks: ReactNode) => <strong className="text-white/90">{chunks}</strong>,
  // Only referenced by s11's body (the data-rights section's own contact
  // line) — harmless no-op tag for every other section, ICU only invokes a
  // tag renderer when the source string actually contains that tag.
  privacyEmail: () => <span className="text-purple-400">privacy@dpnr.app</span>,
}

const SECTION_IDS = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13',
] as const

export default async function TermsPage() {
  const t = await getTranslations('Terms')
  // A logged-in user reaching this page (e.g. from /account) should return
  // there, not bounce to /signup — the old hardcoded link ignored session
  // state entirely. Server-rendered so this needs no client-side fetch.
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

      <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 text-sm leading-relaxed">

        {SECTION_IDS.map((id) => (
          <Section key={id} title={t(`sections.${id}.title`)}>
            {t.rich(`sections.${id}.body`, RICH_TAGS)}
          </Section>
        ))}

        <div className="pt-4 border-t border-white/10">
          <p className="text-[var(--color-text-tertiary)] text-xs">
            {t.rich('questionsContact', {
              email: () => <span className="text-purple-400">support@dpnr.app</span>,
            })}
          </p>
          <div className="flex gap-4 mt-3">
            <Link href="/privacy" className="text-purple-400 text-xs hover:text-purple-300">{t('privacyLink')}</Link>
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
