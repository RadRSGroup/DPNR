'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCompanionContext, sendCompanionMessage, sendDailyCardFeedback } from '@/lib/api/v1-client'
import type { CompanionDirective, CompanionContextResponse } from '@dpnr/shared-types'
import DirectiveCard from '@/components/companion/DirectiveCard'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  directive?: CompanionDirective | null
  failed?: boolean
}

/**
 * Companion's frontend — the last major AI surface without one
 * (docs/AGENT_LOG.md Session 12 part 1 built the real backend; this is its
 * first caller). A chat surface, reusing `/v1/companion/message` and
 * `/v1/companion/context` verbatim — the `reply`/`directive` contract is
 * treated as final per the handoff, nothing added client-side to guess at
 * intent the backend didn't return.
 *
 * Deliberately NOT built here (still open, per the handoff): a synthesized
 * "welcome back" opening (workstream C — this page's empty state is just
 * static copy, not a real continuation) and any onboarding/Roadmap flow
 * (workstream D). This page only renders what a real message exchange
 * already returns.
 */
export default function CompanionPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [userInitial, setUserInitial] = useState('?')
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        setUserInitial(email?.[0]?.toUpperCase() ?? '?')

        const context = await getCompanionContext()
        setMessages(context.messages.map((m) => ({ role: m.role, text: m.text, createdAt: m.createdAt })))
        setDailyCard(context.dailyCard)
      } catch {
        // Degrades to an empty chat — same tolerance the Dashboard page uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function handleDailyCardFeedback(action: 'dismiss' | 'relevant' | 'not_relevant') {
    if (action === 'dismiss') {
      setDailyCard(null)
    } else {
      setDailyCard((prev) => (prev ? { ...prev, feedback: action } : prev))
    }
    try {
      await sendDailyCardFeedback(action === 'dismiss' ? { dismissed: true } : { feedback: action })
    } catch {
      // Same tolerance as Dashboard's own version — a failed write just
      // means it may resurface next load.
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text, createdAt: new Date().toISOString() }])
    setSending(true)

    try {
      const clientMessageId = crypto.randomUUID()
      const res = await sendCompanionMessage({ text, clientMessageId })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.reply, createdAt: new Date().toISOString(), directive: res.directive },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Something went wrong on my end — try sending that again.', createdAt: new Date().toISOString(), failed: true },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative h-dvh flex flex-col bg-[#0a0a0f] overflow-hidden max-w-[393px] mx-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />

      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <div>
          <p className="text-purple-400 text-xs tracking-widest uppercase">DPNR</p>
          <h1 className="text-white text-xl font-light">Companion</h1>
        </div>
        <Link
          href="/account"
          className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-700/40 flex items-center justify-center text-purple-300 text-sm hover:bg-purple-600/50 transition-colors"
          title="Account settings"
        >
          {userInitial}
        </Link>
      </div>

      {/* Today's Daily Card — spec §3/§4: its primary surface is "Dashboard +
          Main Chat", not Dashboard alone. Same feedback endpoint as
          Dashboard's own card; dismissing here hides it there too. */}
      {dailyCard && (
        <div className="px-5 pb-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex gap-3">
              <span className="text-lg flex-shrink-0">✦</span>
              <div className="flex-1">
                <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Today</p>
                <p className="text-white/80 text-sm leading-relaxed">{dailyCard.text}</p>
              </div>
              <button
                onClick={() => handleDailyCardFeedback('dismiss')}
                className="text-white/30 hover:text-white/60 text-sm flex-shrink-0"
                title="Dismiss"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 pl-8">
              <button
                onClick={() => handleDailyCardFeedback('relevant')}
                disabled={dailyCard.feedback !== null}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  dailyCard.feedback === 'relevant'
                    ? 'border-purple-500/50 text-purple-300 bg-purple-900/20'
                    : 'border-white/10 text-white/40 hover:text-white/60 disabled:opacity-40'
                }`}
              >
                Useful
              </button>
              <button
                onClick={() => handleDailyCardFeedback('not_relevant')}
                disabled={dailyCard.feedback !== null}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  dailyCard.feedback === 'not_relevant'
                    ? 'border-purple-500/50 text-purple-300 bg-purple-900/20'
                    : 'border-white/10 text-white/40 hover:text-white/60 disabled:opacity-40'
                }`}
              >
                Not for me
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 space-y-3 pb-2">
        {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}

        {!loading && messages.length === 0 && (
          <div className="pt-8 text-center space-y-2">
            <p className="text-white/50 text-sm leading-relaxed">Hi — what&apos;s on your mind?</p>
            <p className="text-white/25 text-xs">
              I can help you think something through, or point you to a Room or a Library topic.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={m.role === 'user' ? 'max-w-[85%]' : 'max-w-[90%]'}>
              <div
                className={
                  m.role === 'user'
                    ? 'bg-purple-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed'
                    : `bg-white/5 border border-white/10 text-white/85 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'border-red-500/30 text-red-300/80' : ''}`
                }
              >
                {m.text}
              </div>
              {m.directive && <DirectiveCard directive={m.directive} />}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Direct navigation to the wider platform from Main Chat itself — spec
          Table 2's own "Surface / Navigation behavior" row: Main Chat "can
          open Dashboard, Rooms, Library... inline or by transition," not
          only by routing through Dashboard first. Relocated below the chat
          (was a thin pill row under the header) and styled like Dashboard's
          own "Explore" tile grid — same four destinations, same tile shape. */}
      <div className="px-5 pt-2">
        <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Explore</p>
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/dashboard"
            className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all"
          >
            <p className="text-white text-xs font-medium">InnerOS</p>
          </Link>
          <Link
            href="/rooms"
            className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all"
          >
            <p className="text-white text-xs font-medium">Work Rooms</p>
          </Link>
          <Link
            href="/twin"
            className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all"
          >
            <p className="text-white text-xs font-medium">InnerSelf</p>
          </Link>
          <Link
            href="/library"
            className="bg-white/5 border border-white/10 hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all"
          >
            <p className="text-white text-xs font-medium">Library</p>
          </Link>
        </div>
      </div>

      <div className="px-5 pb-8 pt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say what's going on..."
          rows={1}
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-purple-500/60 transition-colors max-h-32"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending || loading}
          className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-500 active:scale-[0.98] disabled:bg-white/10 disabled:cursor-not-allowed text-white transition-all"
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 9L16 2L11 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
