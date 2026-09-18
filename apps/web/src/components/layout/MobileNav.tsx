'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname } from '@/i18n/navigation'
import { MessageCircle, LayoutGrid, Hexagon, Compass, BookOpen, User } from 'lucide-react'
import { getPreferences } from '@/lib/api/v1-client'

// A condensed 6-item version of PRIMARY_NAV — a phone-width bottom bar has no
// room for all 7 sidebar items plus the 3 mini-cards, so this picks the
// highest-traffic destinations (now including Library, folded in after the
// user flagged it missing) and folds Growth Tracker/Evolution Map behind My
// Profile. labelKey indexes the `Nav.mobileItems` translation namespace.
const MOBILE_NAV = [
  { labelKey: 'chat', href: '/companion', icon: MessageCircle },
  { labelKey: 'dashboard', href: '/dashboard', icon: LayoutGrid },
  { labelKey: 'mirror', href: '/mirror/new', icon: Hexagon },
  { labelKey: 'decision', href: '/decision/new', icon: Compass },
  { labelKey: 'library', href: '/library', icon: BookOpen },
  { labelKey: 'profile', href: '/account', icon: User },
]

export default function MobileNav() {
  const t = useTranslations('Nav.mobileItems')
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    // Same real-photo-when-set, degrade-to-generic-icon tolerance as
    // Sidebar.tsx's own profile mini-card — the user flagged this was
    // missing here, desktop/mobile should stay consistent.
    getPreferences().then((p) => setAvatarUrl(p.avatarUrl)).catch(() => {})
  }, [])

  return (
    <nav className="flex lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border-glass)] bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="flex w-full max-w-[480px] mx-auto">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          const isProfile = item.labelKey === 'profile'
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-[var(--color-violet-400)]' : 'text-white/50'}`}
            >
              {isProfile && avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a next/image-eligible static host
                <img
                  src={avatarUrl}
                  alt=""
                  className={`w-5 h-5 rounded-full object-cover ${active ? 'ring-2 ring-[var(--color-violet-400)]' : ''}`}
                />
              ) : (
                <Icon className="w-5 h-5" />
              )}
              {t(item.labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
