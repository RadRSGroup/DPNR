'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { getCurrentSession } from '@/lib/cognito/client'

/**
 * "Work Rooms" hub — Decision Room and Mirror Room are both Rooms; this is
 * the one place that lists all of them (extensible to future room types
 * without touching Dashboard). Split out of Dashboard's own CTAs per the
 * user's direct product decision (docs/AGENT_LOG.md, this session): Dashboard
 * is the visual hub with the Roadmap, this is where you actually start one.
 * "Workshop Rooms" — the Session 11 rename — stays reserved for this area
 * specifically, not the product's top-level branding.
 */

// titleKey/subtitleKey index Rooms.decision/Rooms.mirror, resolved via t()
// at render time — module scope has no hook access.
const ROOMS = [
  {
    href: '/decision/new',
    key: 'decision',
    style: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30',
    subtitleClass: 'text-purple-200/60',
  },
  {
    href: '/mirror/new',
    key: 'mirror',
    style: 'bg-white/5 border border-white/10 hover:border-white/20 text-white',
    subtitleClass: 'text-[var(--color-text-tertiary)]',
  },
] as const

export default function RoomsPage() {
  const t = useTranslations('Rooms')
  const [userInitial, setUserInitial] = useState('?')

  useEffect(() => {
    async function load() {
      const session = await getCurrentSession()
      const email = session?.getIdToken().payload.email as string | undefined
      setUserInitial(email?.[0]?.toUpperCase() ?? '?')
    }
    load()
  }, [])

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/utility-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <h1 className="text-white text-xl font-light">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-xs underline">
            {t('innerOS')}
          </Link>
          <Link
            href="/account"
            className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-700/40 flex items-center justify-center text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
            title={t('accountSettingsTitle')}
          >
            {userInitial}
          </Link>
        </div>
      </div>

      <p className="text-[var(--color-text-tertiary)] text-sm leading-relaxed mb-6">
        {t('subtitle')}
      </p>

      <div className="space-y-3">
        {ROOMS.map((room) => (
          <Link
            key={room.href}
            href={room.href}
            className={`flex items-center justify-between w-full rounded-2xl px-5 py-4 active:scale-[0.98] transition-all ${room.style}`}
          >
            <div>
              <p className="font-medium text-base">{t(`${room.key}.title`)}</p>
              <p className={`text-xs mt-0.5 ${room.subtitleClass}`}>{t(`${room.key}.subtitle`)}</p>
            </div>
            <span className="text-2xl">+</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
