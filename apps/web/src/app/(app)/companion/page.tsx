'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Cloud, Shuffle, Sparkles } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCompanionContext, sendCompanionMessage, ApiError } from '@/lib/api/v1-client'
import type { CompanionDirective, CompanionContextResponse } from '@dpnr/shared-types'
import DirectiveCard from '@/components/companion/DirectiveCard'
import DailyGuidanceCard from '@/components/companion/DailyGuidanceCard'
import { CreditsExhaustedModal } from '@/components/ui/CreditsExhaustedModal'
import Card from '@/components/ui/Card'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  directive?: CompanionDirective | null
  failed?: boolean
}

const QUICK_PROMPTS = [
  { icon: Heart, lead: 'Help me understand', rest: "what I'm feeling", text: "Help me understand what I'm feeling right now." },
  { icon: Cloud, lead: 'Help me see', rest: 'the pattern', text: 'Help me see the pattern in what I keep going through.' },
  { icon: Shuffle, lead: 'Help me make', rest: 'a decision', text: "I'm stuck on a decision — help me make it." },
  { icon: Sparkles, lead: 'Guide me based on', rest: 'what you know about me', text: 'Guide me based on what you know about me so far.' },
]

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Companion's frontend — the last major AI surface without one
 * (docs/AGENT_LOG.md Session 12 part 1 built the real backend; this is its
 * first caller). A chat surface, reusing `/v1/companion/message` and
 * `/v1/companion/context` verbatim — the `reply`/`directive` contract is
 * treated as final per the handoff, nothing added client-side to guess at
 * intent the backend didn't return.
 *
 * UI redesign (Session 20, Phase 2 of docs/AGENT_LOG.md's plan): reskinned
 * against the "Main Chat" reference screen — real time-of-day greeting,
 * quick-prompt starter chips (just fill the input, never auto-send), and
 * the Daily Card moved into a "Pull a Card" widget that lives in a desktop
 * right column and inline above the thread on mobile. The reference's own
 * "Recent Conversations" list has no real backend equivalent — Companion is
 * one continuous thread, not discrete named conversations — so it's
 * deliberately not built rather than faked; see AGENT_LOG.md.
 */
export default function CompanionPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [dailyCard, setDailyCard] = useState<CompanionContextResponse['dailyCard']>(null)
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await getCurrentSession()
        if (!session) { router.push('/login'); return }
        const email = session.getIdToken().payload.email as string | undefined
        const namePart = email?.split('@')[0] ?? ''
        setFirstName(namePart.charAt(0).toUpperCase() + namePart.slice(1))

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
    } catch (err) {
      if (err instanceof ApiError && err.code === 'credits_exhausted') {
        // Mark the just-sent user turn as failed rather than adding a fake
        // assistant reply — the modal itself explains why, no need to also
        // say "something went wrong" over a message that never even reached the model.
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, failed: true } : m)))
        setCreditsExhausted(true)
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Something went wrong on my end — try sending that again.', createdAt: new Date().toISOString(), failed: true },
        ])
      }
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

  function fillPrompt(text: string) {
    setInput(text)
    textareaRef.current?.focus()
  }

  const showPrompts = !loading && messages.length === 0

  return (
    <div className="relative h-[calc(100dvh-4rem)] lg:h-dvh flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-canvas-from)] via-[var(--color-bg-canvas-via)] to-[var(--color-bg-canvas-to)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />
      {creditsExhausted && <CreditsExhaustedModal onClose={() => setCreditsExhausted(false)} />}

      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-3 lg:gap-6 lg:px-8 lg:pt-6">
        {/* Main column */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden max-w-[393px] lg:max-w-none mx-auto w-full">
          {/* Mobile: plain text greeting, no room for hero art here. */}
          <div className="px-5 pt-14 pb-1 lg:hidden">
            <h1 className="font-display text-2xl text-white flex items-center gap-2">
              {timeGreeting()}{firstName ? `, ${firstName}` : ''} <Sparkles className="w-5 h-5 text-[var(--color-amber-400)]" />
            </h1>
          </div>

          {/* Desktop: one hero banner card, same idiom as DecisionRoomLanding/
              MirrorRoomLanding — the portrait bleeds to the card's own top/
              bottom/right edges (an expected crop, not a seam) and only
              fades where it meets the greeting text, into this card's own
              background color so the fade can't mismatch. */}
          <div className="hidden lg:block relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-glass)] bg-[var(--color-surface-glass)] h-64 mb-4">
            <div className="absolute right-0 top-0 bottom-0 w-80 [mask-image:linear-gradient(to_left,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_left,black_55%,transparent_100%)]">
              <Image
                src="/images/companion/companion-hero.webp"
                alt=""
                fill
                sizes="320px"
                className="object-cover object-top"
                priority
              />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-center px-8 max-w-[55%]">
              <h1 className="font-display text-3xl text-white flex items-center gap-2">
                {timeGreeting()}{firstName ? `, ${firstName}` : ''} <Sparkles className="w-5 h-5 text-[var(--color-amber-400)]" />
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                I&apos;m here with you. Let&apos;s continue where you are.
              </p>
            </div>
          </div>

          {/* Daily Card — mobile position, inline above the thread. Desktop
              shows the same widget in the right column instead (below). */}
          {dailyCard && (
            <div className="lg:hidden px-5 pt-2">
              <DailyGuidanceCard dailyCard={dailyCard} showImage={false} />
            </div>
          )}

          {showPrompts && (
            <div className="px-5 lg:px-0 pt-3 pb-1">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => fillPrompt(p.text)}
                    className="text-left bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-[var(--radius-card)] p-3 transition-all"
                  >
                    <p.icon className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                    <p className="text-white/80 text-xs leading-snug">
                      {p.lead} <span className="text-[var(--color-violet-300)]">{p.rest}</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 lg:px-0 space-y-3 pb-2 pt-2">
            {loading && <p className="text-white/30 text-sm text-center pt-8">Loading…</p>}

            {!loading && messages.length === 0 && (
              <div className="pt-4 text-center space-y-2">
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
                        ? `bg-[var(--color-violet-600)] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'opacity-50' : ''}`
                        : `bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'border-red-500/30 text-red-300/80' : ''}`
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
                <div className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] rounded-2xl rounded-bl-md px-4 py-2.5">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Direct navigation to the wider platform from Main Chat itself —
              spec Table 2's own "Surface / Navigation behavior" row. On
              desktop the sidebar already covers every destination here, so
              this row is mobile-only. */}
          <div className="px-5 pt-2 lg:hidden">
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Explore</p>
            <div className="grid grid-cols-4 gap-2">
              <Link href="/dashboard" className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all">
                <p className="text-white text-xs font-medium">InnerOS</p>
              </Link>
              <Link href="/rooms" className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all">
                <p className="text-white text-xs font-medium">Work Rooms</p>
              </Link>
              <Link href="/twin" className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all">
                <p className="text-white text-xs font-medium">InnerSelf</p>
              </Link>
              <Link href="/library" className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] hover:border-white/20 active:scale-[0.98] rounded-2xl p-2.5 text-center transition-all">
                <p className="text-white text-xs font-medium">Library</p>
              </Link>
            </div>
          </div>

          <div className="px-5 lg:px-0 pb-4 pt-3 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share anything with me..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-[var(--color-surface-glass)] border border-white/15 rounded-2xl px-4 py-3 text-white placeholder-white/30 text-base resize-none focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors max-h-32"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || loading}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] active:scale-[0.98] disabled:bg-white/10 disabled:cursor-not-allowed text-white transition-all"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L11 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right column — desktop only */}
        <div className="hidden lg:flex lg:flex-col lg:gap-4 lg:pb-6 lg:overflow-y-auto">
          {dailyCard ? (
            <DailyGuidanceCard dailyCard={dailyCard} />
          ) : (
            <Card>
              <p className="text-white/40 text-xs uppercase tracking-wide">Today&apos;s Guidance</p>
              <p className="text-white/30 text-sm mt-2">Nothing new right now — check back tomorrow.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
