'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Wallet, Headphones, ChevronRight } from 'lucide-react'
import RingLogo from '@/components/icons/RingLogo'
import { getCredits } from '@/lib/api/v1-client'
import { PRIMARY_NAV } from './nav-items'

export default function Sidebar() {
  const pathname = usePathname()
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    getCredits().then((c) => setCredits(c.balance)).catch(() => {
      // Sidebar renders on every page, including ones with no session yet
      // (e.g. mid-redirect) — a failed fetch just leaves the generic label.
    })
  }, [])

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 border-r border-[var(--color-border-glass)] bg-black/20 min-h-screen p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3">
        <RingLogo className="w-8 h-8" />
        <div>
          <div className="text-sm font-semibold leading-tight">DPNR</div>
          <div className="text-xs text-[var(--color-text-tertiary)] leading-tight">innerOS</div>
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
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && <span className="text-[10px] uppercase tracking-wide text-white/40">Soon</span>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 pt-4 border-t border-[var(--color-border-glass)] flex flex-col gap-1">
        <SidebarMiniCard href="/twin" icon={<UserCircleGlow />} title="InnerSelf" subtitle="Your Digital Twin" />
        <SidebarMiniCard
          href="/account"
          icon={<Wallet className="w-[18px] h-[18px]" />}
          title="My Wallet"
          subtitle={credits !== null ? `${credits} credits` : 'View credits'}
        />
        <SidebarMiniCard href="/account" icon={<User className="w-[18px] h-[18px]" />} title="My Profile" subtitle="Settings" />
      </div>

      <div className="mt-auto pt-4 flex items-center gap-3 px-3 py-2.5 text-white/50 text-sm">
        <Headphones className="w-[18px] h-[18px]" />
        <div>
          <div>Need help?</div>
          <div className="text-xs text-white/30">We&apos;re here for you</div>
        </div>
      </div>
    </aside>
  )
}

function UserCircleGlow() {
  return <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[var(--color-violet-500)] to-[var(--color-magenta-500)]" />
}

function SidebarMiniCard({ href, icon, title, subtitle }: { href: string; icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors group">
      <div className="w-8 h-8 rounded-full bg-white/5 border border-[var(--color-border-glass)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white leading-tight truncate">{title}</div>
        <div className="text-xs text-white/40 leading-tight truncate">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 shrink-0" />
    </Link>
  )
}
