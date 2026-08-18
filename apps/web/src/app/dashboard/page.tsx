'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDecisions, getTokenUsage } from '@/lib/supabase/decisions'

type Decision = {
  id: string
  title: string
  subtitle: string | null
  status: string
  current_step: number
  updated_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const justCompleted = params.get('completed') === 'true'

  const [decisions, setDecisions] = useState<Decision[]>([])
  const [tokenData, setTokenData] = useState<{ used: number; cap: number; tier: string } | null>(null)
  const [userInitial, setUserInitial] = useState('?')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const email = user.email ?? ''
        setUserInitial(email[0]?.toUpperCase() ?? '?')

        const [dec, tok] = await Promise.all([getDecisions(), getTokenUsage()])
        setDecisions(dec ?? [])
        setTokenData(tok)
      } catch {
        // silently degrade
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const tokenPct = tokenData ? Math.min(100, Math.round((tokenData.used / tokenData.cap) * 100)) : 0

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-10">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-white text-xl font-light">Decision Room</h1>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-yellow-400 border border-yellow-400/40 rounded-full px-2 py-0.5">Beta</span>
          </div>
        </div>
        <Link
          href="/account"
          className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-700/40 flex items-center justify-center text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
          title="Account settings"
        >
          {userInitial}
        </Link>
      </div>

      {justCompleted && (
        <div className="mb-4 bg-purple-900/40 border border-purple-600/40 rounded-2xl px-4 py-3">
          <p className="text-purple-300 text-sm">✦ Decision mapped. Your reflection is saved.</p>
        </div>
      )}

      {/* Token usage bar */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-xs text-white/40">
          <span>Monthly AI usage</span>
          <span>{loading ? '…' : `${tokenData?.used.toLocaleString() ?? 0} / ${tokenData?.cap.toLocaleString() ?? 15000} tokens`}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${tokenPct > 80 ? 'bg-red-500' : 'bg-purple-500'}`}
            style={{ width: `${tokenPct}%` }}
          />
        </div>
        {tokenData?.tier === 'free' && (
          <p className="text-white/30 text-xs">Free tier · <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline">Upgrade for 150k tokens</Link></p>
        )}
        {tokenData?.tier === 'core' && (
          <p className="text-white/30 text-xs">Core tier · <Link href="/pricing" className="text-purple-400 hover:text-purple-300 underline">Upgrade to Pro</Link></p>
        )}
        {tokenData?.tier === 'pro' && (
          <p className="text-white/30 text-xs">Pro tier</p>
        )}
      </div>

      <Link
        href="/decision/new"
        className="flex items-center justify-between w-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white rounded-2xl px-5 py-4 mb-6 transition-all shadow-lg shadow-purple-900/30"
      >
        <div>
          <p className="font-medium text-base">Start a Decision</p>
          <p className="text-purple-200/60 text-xs mt-0.5">~25 minutes · 7 guided steps</p>
        </div>
        <span className="text-2xl">+</span>
      </Link>

      <div className="space-y-3">
        <p className="text-white/40 text-xs uppercase tracking-wide">Your Decisions</p>
        {loading && (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 animate-pulse h-16" />
            ))}
          </div>
        )}
        {!loading && decisions.map(d => (
          <Link
            key={d.id}
            href={`/decision/${d.id}`}
            className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl px-4 py-4 transition-all"
          >
            <div>
              <p className="text-white text-sm font-medium">&quot;{d.title}&quot;</p>
              <p className="text-white/30 text-xs mt-1">
                {d.status === 'completed' ? '✓ Completed' : `Step ${d.current_step}/7 in progress`} · {timeAgo(d.updated_at)}
              </p>
            </div>
            <span className="text-white/20 text-lg">›</span>
          </Link>
        ))}
        {!loading && decisions.length === 0 && (
          <p className="text-white/30 text-sm text-center py-8">
            No decisions yet.<br />Start your first one above.
          </p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <DashboardContent />
    </Suspense>
  )
}
