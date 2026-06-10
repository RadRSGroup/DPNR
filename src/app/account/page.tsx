'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState('free')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data: profile } = await supabase.from('user_profiles').select('tier').eq('user_id', user.id).single()
      setTier(profile?.tier ?? 'free')
      setLoading(false)
    }
    load()
  }, [router])

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) { alert('Export failed. Please try again.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `decision-room-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm.toLowerCase() !== 'delete my account') return
    setDeleteStep('deleting')
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!res.ok) { alert('Deletion failed. Please contact support.'); setDeleteStep('confirm'); return }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/?deleted=true')
    } catch {
      alert('Deletion failed. Please contact support.')
      setDeleteStep('confirm')
    }
  }

  if (loading) return (
    <div className="relative min-h-screen max-w-[393px] mx-auto flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto px-5 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />

      <div className="pt-14 pb-6">
        <Link href="/dashboard" className="text-purple-400 text-sm">← Dashboard</Link>
        <h1 className="text-white text-xl font-light mt-5">Account</h1>
        <p className="text-white/40 text-sm mt-1">{email}</p>
      </div>

      <div className="space-y-4">

        {/* Plan */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wide mb-3">Subscription</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium capitalize">{tier} plan</p>
              <p className="text-white/30 text-xs mt-0.5">
                {tier === 'free' ? '~7 AI decisions/mo' : tier === 'core' ? '~100 AI decisions/mo' : 'Unlimited AI decisions'}
              </p>
            </div>
            {tier !== 'pro' && (
              <Link href="/pricing" className="text-purple-400 text-xs hover:text-purple-300 border border-purple-700/40 rounded-full px-3 py-1.5 transition-colors">
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Legal */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wide">Legal</p>
          <Link href="/terms" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
            Terms of Use <span className="text-white/20">›</span>
          </Link>
          <div className="border-t border-white/8" />
          <Link href="/privacy" className="flex items-center justify-between text-white/60 hover:text-white text-sm transition-colors">
            Privacy & Data Policy <span className="text-white/20">›</span>
          </Link>
        </div>

        {/* Data */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
          <p className="text-white/40 text-xs uppercase tracking-wide">Your Data</p>

          <div>
            <p className="text-white/80 text-sm font-medium">Download my data</p>
            <p className="text-white/40 text-xs mt-1 mb-3">
              Export all your decisions, reflections, and account data as a JSON file.
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full py-3 rounded-2xl border border-purple-700/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/35 disabled:opacity-40 text-sm font-medium transition-all"
            >
              {downloading ? 'Preparing export…' : 'Download my data'}
            </button>
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-white/80 text-sm font-medium">Delete my account</p>
            <p className="text-white/40 text-xs mt-1 mb-3">
              Permanently deletes your account and all decisions, reflections, and personal data. This cannot be undone.
            </p>

            {deleteStep === 'idle' && (
              <button
                onClick={() => setDeleteStep('confirm')}
                className="w-full py-3 rounded-2xl border border-red-900/40 text-red-400/70 hover:border-red-700/50 hover:text-red-400 text-sm transition-all"
              >
                Delete my account
              </button>
            )}

            {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
              <div className="space-y-3 bg-red-950/20 border border-red-900/30 rounded-2xl p-4">
                <p className="text-red-400 text-xs font-medium">This will permanently delete:</p>
                <ul className="text-white/50 text-xs space-y-1 list-disc pl-4">
                  <li>All your decisions and reflections</li>
                  <li>Your account and login credentials</li>
                  <li>Your subscription (cancels immediately)</li>
                </ul>
                <p className="text-white/50 text-xs">
                  Type <span className="text-white/80 font-mono">delete my account</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="delete my account"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirm.toLowerCase() !== 'delete my account' || deleteStep === 'deleting'}
                    className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-30 text-white text-sm font-medium transition-all"
                  >
                    {deleteStep === 'deleting' ? 'Deleting…' : 'Permanently delete'}
                  </button>
                  <button
                    onClick={() => { setDeleteStep('idle'); setDeleteConfirm('') }}
                    className="px-4 text-white/30 text-sm hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={async () => {
            await fetch('/api/auth/signout', { method: 'POST' })
            window.location.href = '/login'
          }}
          className="w-full py-3.5 rounded-2xl border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-sm transition-all"
        >
          Sign out
        </button>

      </div>
    </div>
  )
}
