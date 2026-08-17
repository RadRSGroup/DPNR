'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto flex flex-col items-center justify-center px-6 gap-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <p className="text-white/40 text-xs uppercase tracking-widest">Something went wrong</p>
      <p className="text-white/60 text-sm text-center leading-relaxed">
        An unexpected error occurred. Your progress is saved — you can continue from the dashboard.
      </p>
      <div className="flex gap-3 w-full">
        <button
          onClick={reset}
          className="flex-1 py-3 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/35 text-sm transition-all"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm text-center transition-all"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
