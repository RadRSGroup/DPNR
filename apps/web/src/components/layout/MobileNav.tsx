'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, LayoutGrid, Hexagon, Compass, User } from 'lucide-react'

// A condensed 5-item version of PRIMARY_NAV — a phone-width bottom bar has no
// room for all 7 sidebar items plus the 3 mini-cards, so this picks the
// highest-traffic destinations and folds everything else behind My Profile.
const MOBILE_NAV = [
  { label: 'Chat', href: '/companion', icon: MessageCircle },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Mirror', href: '/mirror/new', icon: Hexagon },
  { label: 'Decision', href: '/decision/new', icon: Compass },
  { label: 'Profile', href: '/account', icon: User },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border-glass)] bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="flex w-full max-w-[480px] mx-auto">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-[var(--color-violet-400)]' : 'text-white/50'}`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
