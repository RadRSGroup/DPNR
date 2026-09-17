'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Heart, Cloud, Shuffle, UserCircle, Plus, Mic, ImagePlus, X } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCompanionContext, sendCompanionMessage, getPreferences, ApiError } from '@/lib/api/v1-client'
import type { CompanionDirective, ChatBackground } from '@dpnr/shared-types'
import DirectiveCard from '@/components/companion/DirectiveCard'
import PullACard from '@/components/companion/PullACard'
import RecentConversations from '@/components/companion/RecentConversations'
import FocusMode from '@/components/companion/FocusMode'
import TopBar from '@/components/companion/TopBar'
import { CreditsExhaustedModal } from '@/components/ui/CreditsExhaustedModal'
import { useOnboardingFlow } from '@/components/companion/onboarding/useOnboardingFlow'
import OnboardingCardPanel from '@/components/companion/onboarding/OnboardingCardPanel'
import OnboardingSummaryCard from '@/components/companion/onboarding/OnboardingSummaryCard'

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
  { icon: UserCircle, lead: 'Guide me based on', rest: 'what you know about me', text: 'Guide me based on what you know about me so far.' },
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
 * quick-prompt starter chips (just fill the input, never auto-send).
 *
 * Session 42: the reference's other two desktop-right-column pieces are now
 * real. **"Pull a Card"** (`PullACard`) is a genuinely different mechanic
 * from the scheduled Daily Card the other three rooms still use — an
 * on-demand pull from a stored card library, confirmed scoped to Companion
 * only — and replaces this page's own previous dailyCard-driven widget
 * (Session 43 finished the swap on mobile too — see the inline `PullACard`
 * placement below — Session 42 only did desktop's right column). **"Recent
 * Conversations"** (`RecentConversations`) is real too: Companion used to
 * be one continuous thread forever; `sessionId` now identifies a specific
 * conversation, switching/creating one calls `getCompanionContext`/
 * `createCompanionConversation` and swaps `messages`/`sessionId` client-side
 * with no page reload.
 */
function CompanionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = useLocale()
  const t = useTranslations('Onboarding')
  const onboarding = useOnboardingFlow()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Intelligence Spec §18/Appendix B — threaded down into DirectiveCard so a
  // "Explore in Mirror/Decision Room" action from a Library topic can carry
  // "source session" context, per the flow's own worked example.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [firstName, setFirstName] = useState('')
  // Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1) — 'digital_twin'
  // matches the schema's own default, so this is the correct value to render
  // with before the real preference loads, not a placeholder guess.
  const [chatBackground, setChatBackground] = useState<ChatBackground>('digital_twin')
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  // Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.6) — the
  // composer's mic/image icons, confirmed against the reference mockups.
  // Mic is real client-only dictation (Web Speech API, no backend change).
  // The image attach is a real file picker, but `companion/message.ts` has
  // no vision/multimodal path today — attaching one is disclosed to the
  // person rather than silently doing nothing or pretending it was seen.
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  // Feature-detected only after mount (`speechSupported` starts false, same
  // on server and client) — checking `typeof window !== 'undefined'`
  // directly during render is a real hydration mismatch, not a hypothetical:
  // SSR always renders the "unsupported" branch, so any browser that DOES
  // support this API renders a structurally different composer client-side
  // (an extra mic button shifts every sibling after it) — reproduced and
  // fixed live rather than assumed safe.
  const [speechSupported, setSpeechSupported] = useState(false)
  // No official TS lib.dom typings for the (non-standard, webkit-prefixed)
  // Web Speech API yet — `any` here is the constructor itself, not app data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionCtorRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Deferred a tick (same "setState from a callback, not the effect body
    // itself" shape this file's other effects already use for async calls)
    // — this codebase's lint rule flags a direct synchronous setState call
    // in an effect body regardless of why, and a bare feature-detection
    // isn't exempt just because it's cheap.
    Promise.resolve().then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
      if (ctor) {
        SpeechRecognitionCtorRef.current = ctor
        setSpeechSupported(true)
      }
    })
  }, [])

  function toggleDictation() {
    const SpeechRecognitionCtor = SpeechRecognitionCtorRef.current
    if (!SpeechRecognitionCtor) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = locale === 'he' ? 'he-IL' : 'en-US'
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as ArrayLike<{ 0: { transcript: string } }>)
        .map((r) => r[0].transcript)
        .join(' ')
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  function handleAttachClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAttachedFileName(file.name)
    e.target.value = ''
  }

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
        setSessionId(context.sessionId)
      } catch {
        // Degrades to an empty chat — same tolerance the Dashboard page uses.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  useEffect(() => {
    getPreferences()
      .then((p) => setChatBackground(p.chatBackground))
      .catch(() => {
        // Honest degrade to the schema's own default — same tolerance every
        // other best-effort preferences read in this codebase already uses.
      })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  /** Discrete conversations — switch to an existing one from Recent Conversations. */
  async function handleSelectConversation(targetSessionId: string) {
    if (targetSessionId === sessionId || loading) return
    setLoading(true)
    try {
      const context = await getCompanionContext(targetSessionId)
      setMessages(context.messages.map((m) => ({ role: m.role, text: m.text, createdAt: m.createdAt })))
      setSessionId(context.sessionId)
    } catch {
      // Leave the currently-open conversation showing — same tolerance as the initial load.
    } finally {
      setLoading(false)
    }
  }

  /** Discrete conversations — "New conversation" already created the empty session server-side; just reset local state to it. */
  function handleNewConversation(newSessionId: string) {
    setMessages([])
    setSessionId(newSessionId)
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text, createdAt: new Date().toISOString() }])

    // An attachment never actually reaches Companion — no vision/multimodal
    // path exists server-side yet (§3.6) — disclosed locally rather than
    // silently dropped, so the person isn't left assuming it was seen.
    if (attachedFileName) {
      setAttachedFileName(null)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I can see you attached an image — I can't actually look at images yet, but I've got everything else you shared.",
          createdAt: new Date().toISOString(),
        },
      ])
    }

    // First-Time Onboarding's free-text step, moved in-chat: while awaiting
    // it, the composer's Send answers the onboarding question instead of
    // opening a real Companion turn — the source doc's own framing is that
    // this answer "naturally becomes the first conversation," so it's
    // appended as a normal user bubble above but never sent to the model.
    if (onboarding.awaitingIntention) {
      await onboarding.submitIntention(text)
      return
    }

    setSending(true)

    try {
      const clientMessageId = crypto.randomUUID()
      const res = await sendCompanionMessage({ text, clientMessageId, sessionId: sessionId ?? undefined })
      setSessionId(res.sessionId)
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

  /** First Coordinates' Yes/Partly/Not quite — same post-feedback navigation the old `/onboarding` page did. */
  async function handleOnboardingFeedback(feedback: Parameters<typeof onboarding.handleSnapshotFeedback>[0]) {
    if (await onboarding.handleSnapshotFeedback(feedback)) {
      const next = searchParams.get('next') ?? '/companion'
      // A real bug hit and fixed live while building this: `next` can be
      // any protected route the user was originally trying to reach
      // (proxy.ts's onboarding gate carries it forward), not just
      // `/companion` — and while onboarding was still active, this same
      // page's own permanent sidebar/nav `Link`s to those routes (e.g.
      // Dashboard) get auto-prefetched by Next.js, which resolves them
      // against THEN-current cookies and caches the resulting
      // redirect-back-to-`/companion` in the client Router Cache. A plain
      // `router.push(next)` here reused that stale cached entry and
      // bounced straight back instead of landing on `next` — reproduced
      // on every attempt, not a timing fluke. A real browser navigation
      // always re-evaluates the middleware against current cookies, so it
      // sidesteps the stale client-side cache entirely; a one-time
      // "onboarding just finished" transition doesn't need to stay a soft
      // SPA navigation anyway.
      window.location.href = locale === 'he' ? (next === '/' ? '/he' : `/he${next}`) : next
    }
  }

  // Reversed from Session 23's "stay visible alongside an active thread"
  // decision, per direct user feedback (a screenshot showing the greeting +
  // quick prompts + mobile Explore row squeezing the actual chat thread
  // into a few visible lines): the landing chrome now only shows on the
  // true empty state, so an active conversation gets nearly the full
  // vertical space.
  const pageLoading = loading || onboarding.loading
  const isLanding = !pageLoading && messages.length === 0 && !onboarding.active
  const showPrompts = isLanding
  const composerDisabled = pageLoading || (onboarding.active && !onboarding.awaitingIntention)
  // 'custom' falls back to the default preset — no upload endpoint exists
  // yet to have ever set a real chatBackgroundUrl (§3.1's disclosed
  // deferral), so there's nothing else it could render.
  const backgroundSrc =
    chatBackground === 'environment'
      ? '/images/backgrounds/companion-bg-environment.webp'
      : '/images/backgrounds/companion-bg.webp'

  return (
    <div className="relative h-[calc(100dvh-4rem)] lg:h-dvh flex flex-col overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image src={backgroundSrc} alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />
      {creditsExhausted && <CreditsExhaustedModal onClose={() => setCreditsExhausted(false)} />}

      <div className="lg:px-8 lg:pt-6">
        <TopBar />
      </div>

      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-3 lg:gap-6 lg:px-8 lg:pt-0">
        {/* Main column */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden max-w-[393px] lg:max-w-none mx-auto w-full">
          {/* Mobile: plain text greeting, no room for hero art here. Only on
              the true landing state — see isLanding's doc comment above. */}
          {isLanding && (
            <div className="px-5 pt-14 pb-1 lg:hidden">
              <h1 className="font-display text-2xl text-white">
                {timeGreeting()}{firstName ? `, ${firstName}` : ''}
              </h1>
            </div>
          )}

          {/* Desktop: one hero banner card, same idiom as DecisionRoomLanding/
              MirrorRoomLanding — the portrait bleeds to the card's own top/
              bottom/right edges (an expected crop, not a seam) and only
              fades where it meets the greeting text, into this card's own
              background color so the fade can't mismatch. Landing-only, same
              reasoning as the mobile greeting above. */}
          {isLanding && (
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
                <h1 className="font-display text-3xl text-white">
                  {timeGreeting()}{firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  I&apos;m here with you. Let&apos;s continue where you are.
                </p>
              </div>
            </div>
          )}

          {/* Pull a Card — mobile position, inline above the thread. Desktop
              shows the same widget in the always-visible right column
              instead (below); mobile has no persistent sidebar, so it's
              landing-only here, same tradeoff as the quick prompts and
              Explore row just below. This used to show the old scheduled
              Daily Card via DailyGuidanceCard — Session 42 replaced that
              widget slot with Pull a Card on desktop ("replaces this exact
              widget slot rather than stacking alongside the untouched Daily
              Card elsewhere") but missed mobile, leaving it as the only way
              left to reach Pull a Card being desktop-only. */}
          {isLanding && (
            <div className="lg:hidden px-5 pt-2">
              <PullACard />
            </div>
          )}

          {/* pt-14 replaces the greeting block's own safe-area top padding
              once the conversation is active and the greeting is hidden —
              this page has no other fixed header providing that space. */}
          <div
            ref={scrollRef}
            className={`scrollbar-glass flex-1 overflow-y-auto px-5 lg:px-0 pb-2 flex flex-col ${isLanding ? 'pt-2' : 'pt-14 lg:pt-2'} ${
              !pageLoading && messages.length === 0 && !onboarding.active ? 'justify-center' : 'space-y-3'
            }`}
          >
            {pageLoading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">Loading…</p>}

            {/* First-Time Onboarding, moved in-chat (see useOnboardingFlow's
                own doc comment) — a single greeting bubble, then whichever
                step is active: the four tap-to-choose cards, the free-text
                prompt (answered via the composer below, not here), or the
                First Coordinates summary + feedback. */}
            {!pageLoading && onboarding.active && (
              <div className="flex justify-start">
                <div className="max-w-[90%] lg:max-w-[480px]">
                  <div className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                    <p>{t('intro.title')}</p>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1.5">{t('intro.body1')}</p>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">{t('intro.body2')}</p>
                    <p className="text-white/40 text-xs mt-1.5">{t('intro.body3')}</p>
                  </div>

                  {onboarding.cardStep && (
                    <OnboardingCardPanel
                      step={onboarding.cardStep}
                      cardIndex={onboarding.cardIndex}
                      cardTotal={onboarding.cardTotal}
                      saving={onboarding.saving}
                      currentState={onboarding.currentState}
                      activeDomainLabels={onboarding.activeDomainLabels}
                      desiredStates={onboarding.desiredStates}
                      interactionPreferenceLabel={onboarding.interactionPreferenceLabel}
                      onCurrentState={onboarding.handleCurrentState}
                      onSkipCurrentState={onboarding.handleSkipCurrentState}
                      onToggleActiveDomain={onboarding.toggleActiveDomain}
                      onActiveDomainsContinue={onboarding.handleActiveDomainsContinue}
                      onSkipActiveDomains={onboarding.handleSkipActiveDomains}
                      onToggleDesiredState={onboarding.toggleDesiredState}
                      onDesiredStatesContinue={onboarding.handleDesiredStatesContinue}
                      onSkipDesiredStates={onboarding.handleSkipDesiredStates}
                      onInteractionPreference={onboarding.handleInteractionPreference}
                      onSkipInteractionPreference={onboarding.handleSkipInteractionPreference}
                    />
                  )}

                  {onboarding.awaitingIntention && (
                    <div className="mt-2 max-w-[420px] bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl px-4 py-3 text-sm leading-relaxed">
                      <p>{t('cards.currentIntention.prompt')}</p>
                      <button
                        onClick={() => onboarding.skipIntention()}
                        disabled={onboarding.saving}
                        className="text-white/40 hover:text-white/60 text-xs mt-2 transition-colors disabled:opacity-50"
                      >
                        {t('cards.currentIntention.skipButton')}
                      </button>
                    </div>
                  )}

                  {onboarding.showingSummary && (
                    <OnboardingSummaryCard
                      currentState={onboarding.currentState}
                      activeDomainCategories={onboarding.activeDomainCategories}
                      desiredStates={onboarding.desiredStates}
                      interactionMode={onboarding.interactionMode}
                      intentionText={onboarding.intentionText}
                      saving={onboarding.saving}
                      onFeedback={handleOnboardingFeedback}
                    />
                  )}

                  {onboarding.error && <p className="text-red-400 text-xs mt-2">{onboarding.error}</p>}
                </div>
              </div>
            )}

            {/* Same bubble treatment as a real assistant message (no fabricated
                first turn — this is UI chrome, not a message DPNR sent) rather
                than the plain floating text this replaced, so the empty state
                has the same visual weight the reference's own opening line
                does. Vertically centered in the thread area via the parent's
                justify-center above, instead of top-aligned with a large dead
                gap above the input bar. */}
            {!pageLoading && messages.length === 0 && !onboarding.active && (
              <div className="flex justify-start">
                <div className="max-w-[90%] lg:max-w-[480px] bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                  <p>Hi — what&apos;s on your mind?</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-1.5">
                    I can help you think something through, or point you to a Room or a Library topic.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={m.role === 'user' ? 'max-w-[85%] lg:max-w-[400px]' : 'max-w-[90%] lg:max-w-[480px]'}>
                  <div
                    className={
                      m.role === 'user'
                        ? `bg-[var(--color-violet-600)] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'opacity-50' : ''}`
                        : `bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'border-red-500/30 text-red-300/80' : ''}`
                    }
                  >
                    {m.text}
                  </div>
                  {m.directive && <DirectiveCard directive={m.directive} sourceSessionId={sessionId} />}
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
              this row is mobile-only. Landing-only now too — the bottom tab
              bar (Chat/Dashboard/Mirror/Decision/Profile) already gives
              persistent mobile navigation once a conversation is active, so
              this row's job here is a first-visit convenience, not the only
              way to navigate. */}
          {isLanding && (
          <div className="px-5 pt-2 lg:hidden">
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-2">Explore</p>
            <div className="grid grid-cols-4 gap-2">
              <Link href="/dashboard" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">InnerOS</p>
              </Link>
              <Link href="/rooms" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">Work Rooms</p>
              </Link>
              <Link href="/growth" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">Growth</p>
              </Link>
              <Link href="/library" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">Library</p>
              </Link>
            </div>
          </div>
          )}

          {/* Quick-prompt chips — moved below the chat thread, directly above
              the input bar (was between the hero and the thread), per direct
              user feedback: sitting right where composing happens reads more
              like "here's a way to start typing" than chrome squeezed above
              the conversation. Still landing-only (showPrompts === isLanding),
              same gating as before. */}
          {showPrompts && (
            <div className="px-5 lg:px-0 pt-1 pb-2">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => fillPrompt(p.text)}
                    className="liquid-glass text-left rounded-[var(--radius-card)] p-3 active:scale-[0.98]"
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

          {attachedFileName && (
            <div className="px-5 lg:px-0 pb-2">
              <div className="inline-flex items-center gap-2 liquid-glass rounded-full ps-3 pe-2 py-1.5 text-xs text-white/70">
                <ImagePlus className="w-3.5 h-3.5 text-[var(--color-violet-300)]" />
                <span className="truncate max-w-[160px]">{attachedFileName}</span>
                <button
                  onClick={() => setAttachedFileName(null)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div className="px-5 lg:px-0 pb-4 pt-3 flex items-end gap-2">
            <button
              onClick={handleAttachClick}
              disabled={composerDisabled}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--color-surface-glass)] border border-white/15 text-white/60 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Attach"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="flex-1 relative flex items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={onboarding.awaitingIntention ? t('cards.currentIntention.placeholder') : 'Share anything with me...'}
                rows={1}
                disabled={composerDisabled}
                className="flex-1 bg-[var(--color-surface-glass)] border border-white/15 rounded-2xl ps-4 pe-20 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors max-h-32"
              />
              <div className="absolute end-3 bottom-3 flex items-center gap-2.5">
                {speechSupported && (
                  <button
                    onClick={toggleDictation}
                    disabled={composerDisabled}
                    className={`transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      listening ? 'text-[var(--color-violet-300)]' : 'text-white/40 hover:text-white/70'
                    }`}
                    aria-label={listening ? 'Stop dictation' : 'Dictate'}
                  >
                    <Mic className="w-[18px] h-[18px]" />
                  </button>
                )}
                <button
                  onClick={handleAttachClick}
                  disabled={composerDisabled}
                  className="text-white/40 hover:text-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Attach an image"
                >
                  <ImagePlus className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || composerDisabled}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] active:scale-[0.98] disabled:bg-white/10 disabled:cursor-not-allowed text-white transition-all"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L11 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
              </svg>
            </button>
          </div>
          {isLanding && (
            <p className="px-5 lg:px-0 pb-3 text-center text-[var(--color-text-tertiary)] text-xs">
              Everything you share is private and encrypted.
            </p>
          )}
        </div>

        {/* Right column — desktop only, hidden while onboarding owns the thread (same reasoning as the mobile-only widgets above). */}
        {!onboarding.active && (
          <div className="scrollbar-glass hidden lg:flex lg:flex-col lg:gap-4 lg:pb-6 lg:overflow-y-auto">
            <PullACard />
            <RecentConversations
              activeSessionId={sessionId}
              onSelect={handleSelectConversation}
              onCreated={handleNewConversation}
            />
            <FocusMode />
          </div>
        )}
      </div>
    </div>
  )
}

export default function CompanionPage() {
  return (
    <Suspense fallback={<div className="h-dvh" />}>
      <CompanionContent />
    </Suspense>
  )
}
