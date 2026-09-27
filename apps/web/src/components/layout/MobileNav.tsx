'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { usePathname } from '@/i18n/navigation'
import {
  MessageCircle,
  LayoutGrid,
  Hexagon,
  Compass,
  BookOpen,
  User,
  TrendingUp,
  Map,
  Wallet,
  Layers,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { useAvatarUrl } from '@/lib/useAvatarUrl'
import { staggerClass } from '@/lib/motion'

interface MobileNavItem {
  labelKey: string
  href: string
  icon: LucideIcon
}

// Mobile navigation (founder feedback 2026-09-27: every existing
// destination reachable on mobile, using the approved Figma toolbar's
// interaction — tabs either side of a centre button that opens an arc).
// Figma's own tab/arc labels were early placeholders, so the grouping comes
// from the user journey rather than the file: the bar keeps the four core
// surfaces people move between most (Main Chat is the re-entry point, then
// Dashboard and the two rooms), unchanged from the previous bar. The arc
// holds everything else, grouped by purpose: content (Library, Pull a Card),
// progress (Growth Tracker, Evolution Map), account (Wallet, Profile).
// Profile is also one tap away from the avatar in MobileHeader.
// labelKey indexes the `Nav.mobileItems` translation namespace.
const BAR_START: MobileNavItem[] = [
  { labelKey: 'chat', href: '/companion', icon: MessageCircle },
  { labelKey: 'dashboard', href: '/dashboard', icon: LayoutGrid },
]
const BAR_END: MobileNavItem[] = [
  { labelKey: 'mirror', href: '/mirror/new', icon: Hexagon },
  { labelKey: 'decision', href: '/decision/new', icon: Compass },
]
const ARC: MobileNavItem[] = [
  { labelKey: 'library', href: '/library', icon: BookOpen },
  { labelKey: 'pullCard', href: '/companion?card=1', icon: Layers },
  { labelKey: 'growth', href: '/growth', icon: TrendingUp },
  { labelKey: 'evolution', href: '/evolution-map', icon: Map },
  { labelKey: 'wallet', href: '/wallet', icon: Wallet },
  { labelKey: 'profile', href: '/account', icon: User },
]

/** Arc geometry (px): items sit on a half circle around the centre button. */
const ARC_RADIUS = 150
const ARC_FROM_DEG = 155
const ARC_TO_DEG = 25

function isActive(pathname: string | null, href: string) {
  const path = href.split('?')[0]
  return pathname === path || !!pathname?.startsWith(path + '/')
}

export default function MobileNav() {
  const t = useTranslations('Nav.mobileItems')
  const pathname = usePathname()
  // Open for the page it was opened on: navigating anywhere closes it
  // without an effect (links also close it on tap, which covers
  // /companion?card=1 from Main Chat itself).
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn !== null && openOn === pathname
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) =>
    setOpenOn((typeof next === 'function' ? next(open) : next) ? pathname : null)
  // Same real-photo-when-set, degrade-to-generic-icon tolerance as the
  // Sidebar's profile card (shared, cached fetch — lib/useAvatarUrl.ts).
  const avatarUrl = useAvatarUrl()

  // Escape closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const arcActive = ARC.some((item) => isActive(pathname, item.href) && item.labelKey !== 'pullCard')

  function renderTab(item: MobileNavItem) {
    const active = isActive(pathname, item.href)
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? 'text-[var(--color-violet-400)]' : 'text-white/50'}`}
      >
        <Icon className="w-5 h-5" />
        {t(item.labelKey)}
      </Link>
    )
  }

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/55 animate-fade-in"
          />
          {/* The arc: a half-circle outline (as in Figma) with one
              destination per slot. Anchored on the centre button. */}
          <div
            id="mobile-nav-arc"
            className="absolute start-1/2 w-0 h-0 bottom-[calc(1.9rem+env(safe-area-inset-bottom))]"
          >
            <span
              aria-hidden
              className="absolute rounded-full border border-white/25 bg-[var(--color-violet-950)]/95 animate-fade-in"
              style={{
                width: (ARC_RADIUS + 44) * 2,
                height: (ARC_RADIUS + 44) * 2,
                left: -(ARC_RADIUS + 44),
                top: -(ARC_RADIUS + 44),
                clipPath: 'inset(0 0 50% 0)',
              }}
            />
            <ul>
              {ARC.map((item, i) => {
                const deg = ARC_FROM_DEG - ((ARC_FROM_DEG - ARC_TO_DEG) * i) / (ARC.length - 1)
                const rad = (deg * Math.PI) / 180
                const x = Math.cos(rad) * ARC_RADIUS
                const y = -Math.sin(rad) * ARC_RADIUS
                const Icon = item.icon
                const active = isActive(pathname, item.href) && item.labelKey !== 'pullCard'
                const isProfile = item.labelKey === 'profile'
                return (
                  // insetInlineStart mirrors the arc in RTL (Dashboard sits at the reading start).
                  <li key={item.href} className="absolute" style={{ insetInlineStart: x, top: y }}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`-translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 flex w-[4.25rem] flex-col items-center gap-1 text-center text-[11px] leading-tight animate-settle-in ${staggerClass(i)} ${
                        active ? 'text-[var(--color-violet-300)]' : 'text-white/85'
                      }`}
                    >
                      <span className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
                        {isProfile && avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a next/image-eligible static host
                          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <Icon className="w-[18px] h-[18px]" />
                        )}
                      </span>
                      {t(item.labelKey)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <nav className="flex lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border-glass)] bg-[#0a0a0f]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end w-full max-w-[480px] mx-auto">
          {BAR_START.map(renderTab)}
          <div className="flex-1 flex justify-center">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={open ? 'mobile-nav-arc' : undefined}
              aria-label={open ? t('closeMenu') : t('openMenu')}
              className={`-mt-5 mb-1.5 w-14 h-14 rounded-full border flex items-center justify-center transition-colors ${
                open || arcActive
                  ? 'border-[var(--color-violet-400)] bg-[var(--color-violet-600)]/40 text-white'
                  : 'border-white/30 bg-[#16121f] text-white/85'
              }`}
            >
              <Plus className={`w-6 h-6 transition-transform duration-(--motion-calm) ${open ? 'rotate-45' : ''}`} />
            </button>
          </div>
          {BAR_END.map(renderTab)}
        </div>
      </nav>
    </>
  )
}
