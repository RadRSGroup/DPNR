'use client'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { Search, ChevronDown, User as UserIcon, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { getPreferences } from '@/lib/api/v1-client'
import { signOut } from '@/lib/cognito/client'
import { revokeCurrentSessionTicket } from '@/lib/auth/keyBootstrap'
import LanguageSelector from '@/components/shared/LanguageSelector'

/**
 * `useSyncExternalStore` is the correct primitive for a value that changes
 * on its own (a clock tick) and legitimately differs between server and
 * client render — its `getServerSnapshot` return (`null`) is what the
 * server actually renders, so hydration always matches; the real `Date`
 * only appears once the client subscribes. A plain `useState` + `useEffect`
 * either mismatches (SSR renders a real time the client can't reproduce
 * exactly) or trips this codebase's `react-hooks/set-state-in-effect` lint
 * rule (setting state synchronously inside the effect body).
 *
 * `getSnapshot` MUST return a cached, stable reference between ticks —
 * returning `new Date()` fresh on every call (tried first) made every
 * render see a "changed" snapshot, which is an infinite re-render loop,
 * not a hydration fix. The tick value is cached at module scope and only
 * replaced inside the interval callback itself.
 */
let cachedNow: Date | null = null
let clockIntervalId: ReturnType<typeof setInterval> | null = null
const clockListeners = new Set<() => void>()

function subscribeToClock(callback: () => void) {
  clockListeners.add(callback)
  if (!clockIntervalId) {
    cachedNow = new Date()
    // Notify synchronously so the real time shows up on this same
    // subscribe pass, not just on the next 30s tick.
    callback()
    clockIntervalId = setInterval(() => {
      cachedNow = new Date()
      clockListeners.forEach((l) => l())
    }, 30_000)
  }
  return () => {
    clockListeners.delete(callback)
    if (clockListeners.size === 0 && clockIntervalId) {
      clearInterval(clockIntervalId)
      clockIntervalId = null
      cachedNow = null
    }
  }
}
function useClock(): Date | null {
  return useSyncExternalStore(
    subscribeToClock,
    () => cachedNow,
    () => null
  )
}

/**
 * Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §0/§3) — net-new
 * chrome, confirmed directly against the two reference mockups
 * (docs/CHAT UX.png / docs/CHAT UX 2.png), not a relocation of anything
 * that exists elsewhere. Deliberately does NOT include the mockups'
 * "12 min today" pill — that needs a real, honest backend metric this
 * pass doesn't have (§3.3), and this project doesn't fabricate displayed
 * data. The search input is a real, focusable control but doesn't run a
 * query yet (§3.7) — no search index exists anywhere in this codebase.
 */
export default function TopBar() {
  const router = useRouter()
  const t = useTranslations('Companion.topBar')
  const now = useClock()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPreferences()
      .then((p) => setAvatarUrl(p.avatarUrl))
      .catch(() => {
        // Honest degrade — same tolerance Sidebar.tsx already uses for this same call.
      })
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  return (
    <div className="hidden lg:flex items-center gap-4 pb-4">
      <div className="flex-1 flex items-center gap-2 liquid-glass rounded-full px-4 py-2 text-white/40 text-sm max-w-xs">
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{t('searchPlaceholder')}</span>
        <kbd className="text-[10px] border border-white/15 rounded px-1.5 py-0.5">⌘K</kbd>
      </div>

      <div className="flex-1" />

      {/* Fixed min-width so the avatar doesn't shift right once `now`
          resolves from null (server) to a real Date (client, post-mount). */}
      <div className="text-end text-xs leading-tight text-white/50 shrink-0 min-w-[110px]">
        {now && (
          <>
            <p className="text-white/80 text-sm font-medium">
              {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </p>
            <p>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </>
        )}
      </div>

      {/* User-requested (docs/AGENT_LOG.md Session 60 part 2): reachable
          from Main Chat itself, not just buried in Account settings —
          same "persistent chrome" reasoning Sidebar.tsx's own
          LanguageSelector placement already uses. */}
      <LanguageSelector className="shrink-0" />

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full hover:bg-white/5 p-1 transition-colors"
          aria-label={t('accountMenu')}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a next/image-eligible static host
            <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-white/50" />
            </div>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
        </button>

        {menuOpen && (
          <div className="absolute end-0 top-full mt-2 w-44 liquid-glass rounded-xl py-1.5 z-20">
            <Link
              href="/account"
              className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <UserIcon className="w-4 h-4" /> {t('myProfile')}
            </Link>
            <button
              onClick={async () => {
                await revokeCurrentSessionTicket().catch(() => {})
                signOut()
                router.push('/login')
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors text-start"
            >
              <LogOut className="w-4 h-4" /> {t('signOut')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
