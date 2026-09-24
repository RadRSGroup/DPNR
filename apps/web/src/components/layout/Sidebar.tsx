'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname } from '@/i18n/navigation'
import { User, Wallet, ChevronRight } from 'lucide-react'
import RingLogo from '@/components/icons/RingLogo'
import { getCredits, getPreferences } from '@/lib/api/v1-client'
import { PRIMARY_NAV } from './nav-items'
import LanguageSelector from '@/components/shared/LanguageSelector'
import HelpMenu from './HelpMenu'

export default function Sidebar() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const [credits, setCredits] = useState<number | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    getCredits().then((c) => setCredits(c.balance)).catch(() => {
      // Sidebar renders on every page, including ones with no session yet
      // (e.g. mid-redirect) — a failed fetch just leaves the generic label.
    })
    // Session 51 — real photo when set, same tolerance as credits above
    // (degrades to the generic User icon, never a broken image).
    getPreferences().then((p) => setAvatarUrl(p.avatarUrl)).catch(() => {})
  }, [])

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-e border-[var(--color-border-glass)] bg-black/20 min-h-screen p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3">
        <RingLogo className="w-8 h-8" />
        <div>
          <div className="text-sm font-semibold leading-tight">DPNR</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)] leading-tight">{t('tagline')}</div>
          <div className="text-xs text-[var(--color-violet-400)] leading-tight">innerOS</div>
        </div>
      </Link>

      <nav className="mt-2 flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.comingSoon ? '#' : item.href}
              aria-disabled={item.comingSoon}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors
                ${active ? 'bg-[var(--color-violet-600)]/90 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}
                ${item.comingSoon ? 'opacity-50 cursor-default' : ''}
              `}
              onClick={(e) => item.comingSoon && e.preventDefault()}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1">{t(`items.${item.labelKey}`)}</span>
              {item.comingSoon && <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{t('soon')}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-[var(--color-border-glass)] flex flex-col gap-1">
        <SidebarMiniCard
          href="/wallet"
          icon={<Wallet className="w-[18px] h-[18px]" />}
          title={t('myWallet')}
          subtitle={credits !== null ? t('creditsCount', { count: credits }) : t('viewCredits')}
        />
        <SidebarMiniCard
          href="/account"
          icon={
            avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a next/image-eligible static host
              <img src={avatarUrl} alt="" className="w-[18px] h-[18px] rounded-full object-cover" />
            ) : (
              <User className="w-[18px] h-[18px]" />
            )
          }
          title={t('myProfile')}
          subtitle={t('settings')}
        />
      </div>

      <HelpMenu />

      <div className="px-3 pt-3">
        <LanguageSelector className="w-full justify-center" />
      </div>
    </aside>
  )
}

function SidebarMiniCard({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group">
      <div className="w-8 h-8 rounded-full bg-white/5 border border-[var(--color-border-glass)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white leading-tight truncate">{title}</div>
        <div className="text-xs text-[var(--color-text-tertiary)] leading-tight truncate">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[var(--color-text-tertiary)] shrink-0 rtl:-scale-x-100" />
    </Link>
  )
}
