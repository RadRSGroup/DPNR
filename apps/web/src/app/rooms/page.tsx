'use client'
import Link from 'next/link'

/**
 * "Work Rooms" hub — Decision Room and Mirror Room are both Rooms; this is
 * the one place that lists all of them (extensible to future room types
 * without touching Dashboard). Split out of Dashboard's own CTAs per the
 * user's direct product decision (docs/AGENT_LOG.md, this session): Dashboard
 * is the visual hub with the Roadmap, this is where you actually start one.
 * "Workshop Rooms" — the Session 11 rename — stays reserved for this area
 * specifically, not the product's top-level branding.
 */

const ROOMS = [
  {
    href: '/decision/new',
    title: 'Start a Decision',
    subtitle: '~25 minutes · 7 guided steps',
    style: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30',
    subtitleClass: 'text-purple-200/60',
  },
  {
    href: '/mirror/new',
    title: 'Start a Mirror Room session',
    subtitle: '~12 minutes · 6 guided steps',
    style: 'bg-white/5 border border-white/10 hover:border-white/20 text-white',
    subtitleClass: 'text-white/40',
  },
]

export default function RoomsPage() {
  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <h1 className="text-white text-xl font-light">Workshop Rooms</h1>
        </div>
        <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 text-xs underline">
          InnerOS
        </Link>
      </div>

      <p className="text-white/40 text-sm leading-relaxed mb-6">
        Guided sessions to think something through, out loud, with structure.
      </p>

      <div className="space-y-3">
        {ROOMS.map((room) => (
          <Link
            key={room.href}
            href={room.href}
            className={`flex items-center justify-between w-full rounded-2xl px-5 py-4 active:scale-[0.98] transition-all ${room.style}`}
          >
            <div>
              <p className="font-medium text-base">{room.title}</p>
              <p className={`text-xs mt-0.5 ${room.subtitleClass}`}>{room.subtitle}</p>
            </div>
            <span className="text-2xl">+</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
