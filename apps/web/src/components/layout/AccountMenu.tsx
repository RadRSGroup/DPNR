'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import { useAvatarUrl } from '@/lib/useAvatarUrl'
import { logOut } from '@/lib/auth/logout'

/** The profile photo (or a generic icon), sized by `className`. */
export function Avatar({ className = 'w-8 h-8' }: { className?: string }) {
  const avatarUrl = useAvatarUrl()
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 URL, not a next/image-eligible static host
    <img src={avatarUrl} alt="" className={`${className} rounded-full object-cover`} />
  ) : (
    <span className={`${className} rounded-full bg-white/10 flex items-center justify-center`}>
      <UserIcon className="w-1/2 h-1/2 text-white/50" />
    </span>
  )
}

/**
 * Profile photo button with a small menu: My Profile and Log Out (Session
 * 68 — the user asked for a Log Out button and the photo visible from every
 * screen). Used by TopBar (Main Chat, desktop) and MobileHeader (every
 * screen on mobile, rooms included).
 */
export default function AccountMenu({ showChevron = false }: { showChevron?: boolean }) {
  const t = useTranslations('Nav')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleLogOut() {
    if (loggingOut) return
    setLoggingOut(true)
    await logOut()
    router.push('/login')
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('accountMenu')}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full hover:bg-white/5 p-1 transition-colors"
      >
        <Avatar />
        {showChevron && <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
      </button>

      {open && (
        <div role="menu" className="absolute end-0 top-full mt-2 w-44 liquid-glass bg-[var(--color-bg-base)]/90 rounded-xl py-1.5 z-50">
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <UserIcon className="w-4 h-4" /> {t('myProfile')}
          </Link>
          <button
            role="menuitem"
            onClick={handleLogOut}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors text-start disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 rtl:-scale-x-100" /> {t('logOut')}
          </button>
        </div>
      )}
    </div>
  )
}
