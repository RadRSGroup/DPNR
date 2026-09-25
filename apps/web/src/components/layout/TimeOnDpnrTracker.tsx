'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from '@/i18n/navigation'
import { getFocusPlayerState } from '@/lib/focus-player'
import { addTime, classifyTick, TICK_MS } from '@/lib/time-on-dpnr'

// Signed-out / pre-app screens aren't "time on DPNR".
const UNCOUNTED_PATHS = ['/', '/login', '/signup', '/forgot-password', '/terms', '/privacy', '/pricing', '/consent', '/profile-setup']

/**
 * Counts Time on DPNR (see lib/time-on-dpnr.ts). Mounted once in the root
 * layout so the count carries across pages. Renders nothing.
 */
export default function TimeOnDpnrTracker() {
  const pathname = usePathname()
  const counted = !UNCOUNTED_PATHS.includes(pathname)
  const lastInteraction = useRef(0)

  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now()
    }
    // pointermove/scroll too: reading with an occasional scroll or mouse move is active.
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart', 'input'] as const
    events.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }))
    return () => events.forEach((e) => window.removeEventListener(e, mark, { capture: true }))
  }, [])

  useEffect(() => {
    if (!counted) return
    const interval = setInterval(() => {
      const kind = classifyTick(
        document.visibilityState === 'visible',
        Date.now() - lastInteraction.current,
        getFocusPlayerState().moodId !== null
      )
      if (kind) addTime(kind, TICK_MS / 1000)
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [counted])

  return null
}
