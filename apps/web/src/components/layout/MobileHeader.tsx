'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import RingLogo from '@/components/icons/RingLogo'

// Slim, mobile-only brand header — MobileNav.tsx's bottom tab bar has no
// header counterpart, so mobile had zero persistent DPNR branding (desktop
// gets the full lockup via Sidebar.tsx, which is `hidden lg:flex`). This is
// deliberately minimal: icon + wordmark only, no tagline/"innerOS" subtext,
// no hamburger/search — mirrors MobileNav's own fixed-bar convention
// (dark glass/border) but pinned to the top instead of the bottom.
export default function MobileHeader() {
  const t = useTranslations('Nav')

  return (
    <header className="flex lg:hidden fixed top-0 inset-x-0 z-40 h-12 items-center border-b border-[var(--color-border-glass)] bg-[#0a0a0f]/95 backdrop-blur-sm">
      <Link
        href="/dashboard"
        aria-label={t('brandHome')}
        className="flex items-center gap-2 px-4"
      >
        <RingLogo className="w-6 h-6" />
        <span className="text-sm font-semibold leading-tight">DPNR</span>
      </Link>
    </header>
  )
}
