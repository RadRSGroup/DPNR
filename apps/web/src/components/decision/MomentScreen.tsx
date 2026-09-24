'use client'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import PrimaryButton from '@/components/ui/PrimaryButton'
import RoomScreenFrame from '@/components/shared/RoomScreenFrame'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function MomentScreen({ onNext, onBack }: Props) {
  const router = useRouter()
  return (
    <RoomScreenFrame backgroundSrc="/images/backgrounds/decision-bg.webp" glows={['bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)]']}>

      {/* Top bar — matches RoomStepLayout */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2 lg:px-8 lg:pt-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg"
        >✕</button>
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-tertiary)] text-xs">Decision Room</span>
          <span className="text-[var(--color-text-tertiary)] text-xs">25 min</span>
        </div>
        {/* Balances the close button (the old "?" here was a dead, non-button div). */}
        <div className="w-8 h-8" aria-hidden />
      </div>

      {/* Content */}
      <div className="scrollbar-glass flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 pb-8 lg:px-12 lg:pb-10 animate-settle-in">
        <div className="w-full max-w-md text-center space-y-6">
          {/* The Decision Room hero art (same as the landing), as a calm focal point before step 1. */}
          <div className="relative mx-auto w-40 h-40 lg:w-56 lg:h-56 rounded-full overflow-hidden border border-white/15 shadow-[0_0_60px_rgba(139,92,246,0.35)]">
            <Image src="/images/decision/decision-room-hero.webp" alt="" fill sizes="224px" className="object-cover" priority />
          </div>
          <h1 className="text-white text-2xl lg:text-4xl font-light lg:font-display leading-snug">
            A moment before<br />We Begin
          </h1>

          <p className="text-white/60 text-sm lg:text-base leading-relaxed">
            Take a breath. You&apos;re about to give yourself the gift of real clarity. There&apos;s no rush here — just honest reflection, one step at a time.
          </p>

          <PrimaryButton label="Make a decision" onClick={onNext} />

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={onBack}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
                <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={onNext}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
              aria-label="Next"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:-scale-x-100">
                <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </RoomScreenFrame>
  )
}
