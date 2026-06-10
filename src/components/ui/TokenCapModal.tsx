'use client'
import Link from 'next/link'

interface Props {
  onClose: () => void
}

export function TokenCapModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[393px] bg-[#130d1f] border border-purple-700/40 rounded-3xl p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto">✦</div>
          <h2 className="text-white text-lg font-medium">You've used all your AI sessions</h2>
          <p className="text-white/50 text-sm">Your free tier includes ~3 AI-guided decisions per month. Upgrade to continue exploring.</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-between w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white rounded-2xl px-5 py-4 transition-all"
          >
            <div>
              <p className="font-medium text-sm">Core — $15/mo</p>
              <p className="text-purple-200/60 text-xs mt-0.5">~50 AI decisions per month</p>
            </div>
            <span className="text-white/60">›</span>
          </Link>
          <Link
            href="/pricing"
            className="flex items-center justify-between w-full bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] text-white rounded-2xl px-5 py-4 transition-all"
          >
            <div>
              <p className="font-medium text-sm">Pro — $25/mo</p>
              <p className="text-white/30 text-xs mt-0.5">~133 AI decisions per month</p>
            </div>
            <span className="text-white/20">›</span>
          </Link>
        </div>

        <button onClick={onClose} className="w-full text-white/30 text-sm hover:text-white/50 transition-colors py-1">
          Not now
        </button>
      </div>
    </div>
  )
}
