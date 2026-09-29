'use client'
import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { isAppPath } from '@/lib/navigation/app-paths'
import { touchVisit, VISIT_GAP_MS } from '@/lib/visit'

/** A field someone has typed into (a draft that would be lost on redirect). */
function hasUnsavedText(): boolean {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('textarea, input[type="text"], input:not([type])')].some(
    (el) => el.value.trim().length > 0
  )
}

/**
 * Every visit starts in Main Chat (lib/visit.ts), even when the sign-in
 * token is still valid: a bookmark, a restored tab or a typed URL to any
 * other app page opens Main Chat instead when it starts a new visit. The
 * page you were on isn't reopened ("do not automatically return them to
 * the last room or screen", founder #5). Room progress is saved server-side
 * and stays reachable from each room's landing.
 *
 * Decided on each page load, and when a tab comes back into view after
 * the gap (a tab left open overnight), on app pages only: sign-in, consent
 * and public pages never start or redirect a visit. Never mid-visit, so
 * normal navigation is untouched. A returning tab with something typed
 * into a field stays put rather than losing it. While any app page is
 * visible it keeps the visit alive. Mounted in the root layout; renders
 * nothing.
 */
export default function VisitGate() {
  const pathname = usePathname()
  const router = useRouter()
  const onAppPage = isAppPath(pathname)
  const decided = useRef(false)

  useEffect(() => {
    if (!onAppPage || decided.current) return
    decided.current = true
    const { isNew } = touchVisit()
    if (isNew && !pathname.startsWith('/companion')) router.replace('/companion')
  }, [onAppPage, pathname, router])

  useEffect(() => {
    if (!onAppPage) return
    const keepAlive = () => {
      if (document.visibilityState !== 'visible') return
      const { isNew } = touchVisit()
      if (isNew && !window.location.pathname.includes('/companion') && !hasUnsavedText()) router.replace('/companion')
    }
    const interval = setInterval(keepAlive, Math.min(60_000, VISIT_GAP_MS / 3))
    document.addEventListener('visibilitychange', keepAlive)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', keepAlive)
    }
  }, [onAppPage, router])

  return null
}
