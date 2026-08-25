'use client'
import Link from 'next/link'

interface Props {
  onClose: () => void
}

/**
 * Shown on a real 402 `credits_exhausted` from a Room REFINE or a Companion
 * message (Session 18). Unlike the older TokenCapModal (still dead code —
 * useAI.ts's tokenCapReached is hardcoded false, unrelated to Credits), this
 * points to /account's real Credits card rather than /pricing's still-
 * "coming soon" purchase flow, since there is no pack-purchase flow live yet.
 */
export function CreditsExhaustedModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[393px] bg-[#130d1f] border border-purple-700/40 rounded-3xl p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto">✦</div>
          <h2 className="text-white text-lg font-medium">You&apos;re out of credits</h2>
          <p className="text-white/50 text-sm">Every AI-guided step in a Room or a message with your Companion uses a credit. Check your balance on your account page.</p>
        </div>

        <Link
          href="/account"
          className="flex items-center justify-between w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white rounded-2xl px-5 py-4 transition-all"
        >
          <span className="font-medium text-sm">View my credits</span>
          <span className="text-white/60">›</span>
        </Link>

        <button onClick={onClose} className="w-full text-white/30 text-sm hover:text-white/50 transition-colors py-1">
          Not now
        </button>
      </div>
    </div>
  )
}
