import Image from 'next/image'
import Sidebar from '@/components/layout/Sidebar'

interface RoomScreenFrameProps {
  /** Room background art; omit for a plain dark background (Celebration). */
  backgroundSrc?: string
  /** Extra full-bleed glow layers, as background classes (each screen keeps its own tint). */
  glows?: string[]
  /** Extra classes for the content column/card (e.g. centring). */
  className?: string
  children: React.ReactNode
}

/**
 * Frame for the room screens that aren't numbered steps — Decision Room's
 * Moment, Section Summary, Body Emotion Mapping, Commitment, Celebration,
 * Completion, and Mirror Room's Commitment and Completion (Session 68).
 *
 * They each used to draw their own 393px phone frame, and most painted a
 * solid `#0a0a0f` over their own background art (a non-isolated parent's
 * background paints above its `-z-10` children), so on desktop they read
 * as a black box. This matches `RoomStepLayout`: the room art full-bleed
 * behind the page, sidebar, and the screen's content in a centred glass
 * card. Mobile is unchanged — the same full-height column as before.
 */
export default function RoomScreenFrame({ backgroundSrc, glows = [], className = '', children }: RoomScreenFrameProps) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="relative isolate h-dvh flex flex-col bg-[var(--color-bg-base)] overflow-hidden max-w-[393px] mx-auto lg:h-auto lg:min-h-screen lg:max-w-none lg:items-center lg:justify-center lg:px-10 lg:py-10">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {backgroundSrc && <Image src={backgroundSrc} alt="" fill sizes="100vw" className="object-cover lg:opacity-60" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
          </div>
          {glows.map((glow) => (
            <div key={glow} className={`absolute inset-0 -z-10 ${glow}`} />
          ))}

          <div
            className={`relative flex-1 min-h-0 w-full flex flex-col overflow-hidden lg:flex-none lg:max-w-2xl lg:h-[min(820px,calc(100vh-5rem))] lg:rounded-3xl lg:border lg:border-white/12 lg:bg-white/[0.04] lg:backdrop-blur-xl lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-20px_rgba(0,0,0,0.6)] ${className}`}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
