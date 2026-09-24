'use client'
import { useSyncExternalStore } from 'react'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import LanguageSelector from '@/components/shared/LanguageSelector'
import AccountMenu from '@/components/layout/AccountMenu'

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
  const t = useTranslations('Companion.topBar')
  const now = useClock()

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

      {/* Shared with MobileHeader (Session 68): photo + My Profile / Log Out. */}
      <AccountMenu showChevron />
    </div>
  )
}
