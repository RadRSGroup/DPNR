'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Heart, Cloud, Shuffle, UserCircle, Plus, Mic, ImagePlus, X, MessagesSquare, Pencil } from 'lucide-react'
import { getCurrentSession } from '@/lib/cognito/client'
import { getCompanionContext, sendCompanionMessage, getPreferences, createCompanionConversation, ApiError } from '@/lib/api/v1-client'
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
  // Added during this visit (sent, replied, errored) rather than loaded with
  // the thread — only these get an entrance animation (docs/MOTION.md: only
  // new things animate; opening a conversation doesn't replay 40 bubbles).
  fresh?: boolean
  // True once the server has stored this message — `createdAt` is then its
  // real sort key, which is what edit & resend needs. Local-only bubbles
  // (attachment notice, onboarding answer, failures) are never editable.
  persisted?: boolean
}

// Icons paired with their `Companion.quickPrompts.<key>` i18n namespace —
// the lead/rest/text copy itself now lives in messages/en.json + he.json,
// not here, so this array only carries what i18n can't (the icon).
const QUICK_PROMPT_KEYS = [
  { icon: Heart, key: 'understand' as const },
  { icon: Cloud, key: 'pattern' as const },
  { icon: Shuffle, key: 'decision' as const },
  { icon: UserCircle, key: 'guide' as const },
]

function timeGreeting(t: (key: string) => string) {
  const h = new Date().getHours()
  if (h < 12) return t('greeting.morning')
  if (h < 18) return t('greeting.afternoon')
  return t('greeting.evening')
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
  const tc = useTranslations('Companion')
  const tr = useTranslations('Companion.recentConversations')
  const onboarding = useOnboardingFlow()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Session 60 — a fresh, ephemeral "welcome back" line on every visit
  // (the user's own explicit ask), never one of `messages`: it's not
  // persisted server-side (see context.ts's synthesizeReturnGreeting),
  // so it must not be treated as a real stored chat turn here either —
  // re-fetched fresh on every load, never carried across a send/reload.
  const [returnGreeting, setReturnGreeting] = useState<string | null>(null)
  // Intelligence Spec §18/Appendix B — threaded down into DirectiveCard so a
  // "Explore in Mirror/Decision Room" action from a Library topic can carry
  // "source session" context, per the flow's own worked example.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false) // mobile-only Recent Conversations sheet
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  // Bumped when a different conversation is shown; keys the thread so it
  // fades in as a whole (0 = first load, no fade).
  const [threadKey, setThreadKey] = useState(0)
  // Next scroll-to-bottom: instant after loading/switching a thread, smooth
  // only when a new message arrives (and never smooth under reduced motion).
  const nextScrollInstant = useRef(true)
  const [firstName, setFirstName] = useState('')
  // Main Chat UX Update (docs/MAIN_CHAT_UX_UPDATE_PLAN.md §3.1) — 'digital_twin'
  // matches the schema's own default, so this is the correct value to render
  // with before the real preference loads, not a placeholder guess.
  const [chatBackground, setChatBackground] = useState<ChatBackground>('digital_twin')
  const [chatBackgroundUrl, setChatBackgroundUrl] = useState<string | null>(null)
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
        nextScrollInstant.current = true
        setMessages(context.messages.map((m) => ({ role: m.role, text: m.text, createdAt: m.createdAt, persisted: true })))
        setSessionId(context.sessionId)
        setReturnGreeting(context.greeting)
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
      .then((p) => {
        setChatBackground(p.chatBackground)
        setChatBackgroundUrl(p.chatBackgroundUrl)
      })
      .catch(() => {
        // Honest degrade to the schema's own default — same tolerance every
        // other best-effort preferences read in this codebase already uses.
      })
  }, [])

  useEffect(() => {
    const instant =
      nextScrollInstant.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nextScrollInstant.current = false
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: instant ? 'auto' : 'smooth' })
  }, [messages, sending, threadKey])

  /** Discrete conversations — switch to an existing one from Recent Conversations. */
  async function handleSelectConversation(targetSessionId: string) {
    if (targetSessionId === sessionId || loading) return
    setLoading(true)
    try {
      const context = await getCompanionContext(targetSessionId)
      nextScrollInstant.current = true
      setThreadKey((k) => k + 1)
      setMessages(context.messages.map((m) => ({ role: m.role, text: m.text, createdAt: m.createdAt, persisted: true })))
      setSessionId(context.sessionId)
      setReturnGreeting(context.greeting)
    } catch {
      // Leave the currently-open conversation showing — same tolerance as the initial load.
    } finally {
      setLoading(false)
    }
  }

  /** Discrete conversations — "New conversation" already created the empty session server-side; just reset local state to it. */
  function handleNewConversation(newSessionId: string) {
    nextScrollInstant.current = true
    setThreadKey((k) => k + 1)
    setMessages([])
    setSessionId(newSessionId)
    setReturnGreeting(null) // a brand-new thread has nothing to welcome the person back to yet
  }

  /**
   * A conversation was deleted from Recent Conversations. Only matters when
   * it was the open one: switch to the most recent remaining conversation,
   * or start a fresh one if none are left (the server already cleared its
   * active-session pointer, so a stale id must not stay on screen).
   */
  async function handleDeletedConversation(deletedSessionId: string, nextSessionId: string | null) {
    if (deletedSessionId !== sessionId) return
    if (nextSessionId) {
      await handleSelectConversation(nextSessionId)
      return
    }
    try {
      const { sessionId: freshId } = await createCompanionConversation()
      handleNewConversation(freshId)
    } catch {
      setMessages([])
      setSessionId(null)
      setReturnGreeting(null)
    }
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text, createdAt: new Date().toISOString(), fresh: true }])

    // An attachment never actually reaches Companion — no vision/multimodal
    // path exists server-side yet (§3.6) — disclosed locally rather than
    // silently dropped, so the person isn't left assuming it was seen.
    if (attachedFileName) {
      setAttachedFileName(null)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: tc('attachmentNotSupported'),
          createdAt: new Date().toISOString(),
          fresh: true,
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
        ...markLastUserPersisted(prev, res.userMessageCreatedAt),
        { role: 'assistant', text: res.reply, createdAt: res.replyCreatedAt ?? new Date().toISOString(), directive: res.directive, persisted: true, fresh: true },
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
          { role: 'assistant', text: tc('sendError'), createdAt: new Date().toISOString(), failed: true, fresh: true },
        ])
      }
    } finally {
      setSending(false)
    }
  }

  /**
   * Edit & resend: replaces message `index` and everything after it. The
   * server only deletes the old tail once the new reply exists, so on any
   * failure the original thread is restored exactly as it was.
   */
  async function handleEditSubmit(index: number) {
    const original = messages[index]
    const text = editText.trim()
    if (!original || !text || sending) return
    if (text === original.text) {
      setEditingIndex(null)
      return
    }
    const snapshot = messages
    setEditingIndex(null)
    setReturnGreeting(null)
    setMessages([...messages.slice(0, index), { role: 'user', text, createdAt: new Date().toISOString(), fresh: true }])
    setSending(true)
    try {
      const res = await sendCompanionMessage({
        text,
        clientMessageId: crypto.randomUUID(),
        sessionId: sessionId ?? undefined,
        replaceFromCreatedAt: original.createdAt,
      })
      setMessages((prev) => [
        ...markLastUserPersisted(prev, res.userMessageCreatedAt),
        { role: 'assistant', text: res.reply, createdAt: res.replyCreatedAt ?? new Date().toISOString(), directive: res.directive, persisted: true, fresh: true },
      ])
    } catch (err) {
      setMessages(snapshot)
      if (err instanceof ApiError && err.code === 'credits_exhausted') {
        setCreditsExhausted(true)
      } else {
        alert(tc('editFailed'))
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

  // isLanding still gates the hero/mobile-greeting/Explore-row chrome —
  // Session 23's own "stay visible alongside an active thread" reversal
  // (a screenshot showed that chrome + quick prompts + the Explore row
  // squeezing the actual thread into a few visible lines) is still the
  // right call for THAT chrome. Session 60 decoupled the quick-prompt
  // chips specifically, per the user's explicit "chips always visible"
  // ask — showPrompts no longer implies isLanding.
  const pageLoading = loading || onboarding.loading
  const isLanding = !pageLoading && messages.length === 0 && !onboarding.active
  const showPrompts = !pageLoading && !onboarding.active
  const composerDisabled = pageLoading || (onboarding.active && !onboarding.awaitingIntention)
  // Session 67: the two generic preset images are retired — the person's own
  // image (an upload or a generated Vision) or a plain default. 'custom' with
  // no chatBackgroundUrl yet, and the legacy 'digital_twin'/'environment'
  // values, all render the default.
  const showCustom = chatBackground === 'custom' && chatBackgroundUrl !== null

  return (
    // With the person's own photo, chat surfaces (bubbles, composer — all
    // --color-surface-glass) get a dark backing instead of the whole photo
    // being flattened: readability lives on the bubbles, the photo stays
    // visible (user feedback on the first, too-heavy scrim).
    <div
      className={`relative h-[calc(100dvh-4rem)] lg:h-dvh flex flex-col overflow-hidden ${
        showCustom ? '[--color-surface-glass:rgba(10,10,15,0.62)] lg:[--color-surface-glass:rgba(12,10,22,0.7)] [--color-border-glass:rgba(255,255,255,0.14)]' : ''
      }`}
    >
      {/* overflow-hidden here, not just on the page: the custom photo is
          scale-105, and unclipped it gave the page root scrollable overflow
          — anything calling scrollIntoView (e.g. the Spotify embed loading)
          then shifted the whole layout ~25px. */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {showCustom && (
          // A presigned S3 URL — next/image's remote-pattern allowlist
          // doesn't cover this per-account, ever-changing host, same
          // reasoning as AvatarUpload.tsx's own <img>.
          // Light blur (scaled up so the blurred edges stay off-screen):
          // a busy photo's own detail/text otherwise competes with the chat.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chatBackgroundUrl!} alt="" className="w-full h-full object-cover blur-[1.5px] scale-[1.03]" />
        )}
        {/* Light scrim for the person's own photo — just enough to calm a
            very bright image; the bubbles carry their own dark backing
            (see the container above), so this no longer has to flatten it. */}
        {showCustom && <div className="absolute inset-0 bg-[var(--color-bg-base)]/35" />}
        {/* Wide screens: the chat column sits over a large, often busy part
            of the photo. A soft dark wash centred on that column (a gradient,
            not a blur: bubbles settle in as they arrive, and MOTION.md rules
            out moving blurred glass) keeps text readable; the photo's edges
            and the right column stay as they are. */}
        {showCustom && (
          <div className="hidden lg:block absolute inset-0 bg-[radial-gradient(ellipse_42%_75%_at_36%_58%,rgba(10,10,15,0.5)_0%,rgba(10,10,15,0.22)_60%,transparent_100%)]" />
        )}
        {/* Default: back to the earlier Main Chat atmosphere (feedback log,
            2026-09-25: "deep blue / indigo / blue-purple") — the original
            companion-bg art, which Session 67 had dropped for a plain
            background, plus a soft indigo wash toward blue. */}
        {!showCustom && (
          <>
            <Image src="/images/backgrounds/companion-bg.webp" alt="" fill sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_60%_35%,rgba(79,70,229,0.22)_0%,transparent_70%),linear-gradient(to_bottom,rgba(30,27,75,0.35),transparent_60%)]" />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_rgba(139,92,246,0.18)_0%,_transparent_70%)] -z-10" />
      {creditsExhausted && <CreditsExhaustedModal onClose={() => setCreditsExhausted(false)} />}

      {/* Mobile: Recent Conversations has no room in the single-column
          layout (desktop shows it in the right column), so it lives behind
          this button as a bottom sheet — same component, same actions. */}
      {!onboarding.active && (
        <button
          onClick={() => setHistoryOpen(true)}
          className="lg:hidden fixed top-14 end-4 z-30 inline-flex items-center gap-1.5 liquid-glass rounded-full px-3 py-1.5 text-xs text-white/80"
          aria-label={tr('showHistory')}
        >
          <MessagesSquare className="w-3.5 h-3.5" /> {tr('showHistory')}
        </button>
      )}
      {historyOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setHistoryOpen(false)}>
          <div className="w-full max-h-[75dvh] overflow-y-auto p-3 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setHistoryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full liquid-glass text-white/70"
                aria-label={tr('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <RecentConversations
              activeSessionId={sessionId}
              onSelect={(id) => {
                setHistoryOpen(false)
                void handleSelectConversation(id)
              }}
              onCreated={(id) => {
                setHistoryOpen(false)
                handleNewConversation(id)
              }}
              onDeleted={handleDeletedConversation}
            />
          </div>
        </div>
      )}

      <div className="lg:px-8 lg:pt-6">
        <TopBar />
      </div>

      <div className="flex-1 overflow-hidden lg:grid lg:grid-cols-3 lg:gap-6 lg:px-8 lg:pt-0">
        {/* Main column */}
        {/* Mobile landing: greeting + Pull a Card + Explore + prompts + composer
            are taller than a phone, and only the thread used to scroll, so the
            bottom (prompts, composer) was clipped (user report, Session 69).
            On the mobile landing the whole column scrolls instead, the thread
            keeps its natural height, and the composer sticks to the bottom. */}
        <div
          className={`lg:col-span-2 h-full flex flex-col overflow-hidden max-w-[393px] lg:max-w-none mx-auto w-full ${
            isLanding ? 'max-lg:overflow-y-auto no-scrollbar' : ''
          }`}
        >
          {/* Mobile: plain text greeting, no room for hero art here. Only on
              the true landing state — see isLanding's doc comment above. */}
          {isLanding && (
            <div className="px-5 pt-14 pb-1 lg:hidden">
              <h1 className="font-display text-2xl text-white">
                {timeGreeting(tc)}{firstName ? `, ${firstName}` : ''}
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
                  {timeGreeting(tc)}{firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {tc('hero.subtitle')}
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
            key={threadKey}
            className={`${threadKey > 0 ? 'animate-fade-in ' : ''}scrollbar-glass flex-1 overflow-y-auto px-5 lg:px-0 pb-2 flex flex-col ${isLanding ? 'pt-2 max-lg:flex-none max-lg:overflow-visible' : 'pt-14 lg:pt-2'} ${
              !pageLoading && messages.length === 0 && !onboarding.active ? 'justify-center' : 'space-y-3'
            }`}
          >
            {pageLoading && <p className="text-[var(--color-text-tertiary)] text-sm text-center pt-8">{tc('loading')}</p>}

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
                  <p>{tc('emptyState.title')}</p>
                  <p className="text-[var(--color-text-tertiary)] text-xs mt-1.5">
                    {tc('emptyState.body')}
                  </p>
                </div>
              </div>
            )}

            {/* Session 60 — a fresh "welcome back" line every visit, per the
                user's explicit ask. Rendered separately from `messages`
                (same bubble styling as a real assistant turn, so it doesn't
                read as a different kind of thing) since it's never
                persisted server-side — re-synthesized on every load, not
                carried in the stored thread the way a real reply is. */}
            {!pageLoading && !onboarding.active && returnGreeting && (
              <div className="flex justify-start">
                <div className="max-w-[90%] lg:max-w-[480px] bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-es-md px-4 py-2.5 text-sm leading-relaxed">
                  {returnGreeting}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${
                  m.fresh ? (m.role === 'user' ? 'animate-settle-in-quick' : 'animate-settle-in') : ''
                }`}
              >
                <div className={m.role === 'user' ? 'max-w-[85%] lg:max-w-[400px]' : 'max-w-[90%] lg:max-w-[480px]'}>
                  <div
                    className={
                      m.role === 'user'
                        ? `bg-[var(--color-violet-600)] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'opacity-50' : ''}`
                        : `bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] text-white/85 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${m.failed ? 'border-red-500/30 text-red-300/80' : ''}`
                    }
                  >
                    {editingIndex === i ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              void handleEditSubmit(i)
                            }
                            if (e.key === 'Escape') setEditingIndex(null)
                          }}
                          autoFocus
                          rows={Math.min(6, Math.max(2, Math.ceil(editText.length / 40)))}
                          maxLength={8000}
                          aria-label={tc('editMessage')}
                          className="w-full min-w-[220px] bg-black/20 rounded-lg px-2 py-1.5 text-sm text-white resize-none focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingIndex(null)} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">
                            {tc('editCancel')}
                          </button>
                          <button
                            onClick={() => void handleEditSubmit(i)}
                            disabled={!editText.trim()}
                            className="text-xs px-3 py-1 rounded-full bg-white text-[var(--color-violet-700)] font-medium disabled:opacity-50"
                          >
                            {tc('editSend')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      m.text
                    )}
                  </div>
                  {m.role === 'user' && m.persisted && !m.failed && editingIndex !== i && !sending && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => {
                          setEditingIndex(i)
                          setEditText(m.text)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/75 px-1"
                        aria-label={tc('editMessage')}
                      >
                        <Pencil className="w-3 h-3" /> {tc('edit')}
                      </button>
                    </div>
                  )}
                  {m.directive && <DirectiveCard directive={m.directive} sourceSessionId={sessionId} />}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start animate-fade-in" role="status" aria-label={tc('replying')}>
                <div className="bg-[var(--color-surface-glass)] border border-[var(--color-border-glass)] rounded-2xl rounded-es-md px-4 py-3">
                  {/* Soft opacity wave, not a bounce (docs/MOTION.md, user-approved). */}
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-soft-pulse stagger-0" />
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-soft-pulse stagger-1" />
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-soft-pulse stagger-2" />
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
            <p className="text-[var(--color-text-tertiary)] text-xs uppercase tracking-wide mb-2">{tc('explore.label')}</p>
            <div className="grid grid-cols-4 gap-2">
              <Link href="/dashboard" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">{tc('explore.innerOS')}</p>
              </Link>
              <Link href="/rooms" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">{tc('explore.workRooms')}</p>
              </Link>
              <Link href="/growth" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">{tc('explore.growth')}</p>
              </Link>
              <Link href="/library" className="liquid-glass active:scale-[0.98] rounded-2xl p-2.5 text-center">
                <p className="text-white text-xs font-medium">{tc('explore.library')}</p>
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
                {QUICK_PROMPT_KEYS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => fillPrompt(tc(`quickPrompts.${p.key}.text`))}
                    className="liquid-glass text-left rounded-[var(--radius-card)] p-3 active:scale-[0.98]"
                  >
                    <p.icon className="w-4 h-4 text-[var(--color-violet-400)] mb-2" />
                    <p className="text-white/80 text-xs leading-snug">
                      {tc(`quickPrompts.${p.key}.lead`)} <span className="text-[var(--color-violet-300)]">{tc(`quickPrompts.${p.key}.rest`)}</span>
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
                  aria-label={tc('composer.removeAttachment')}
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
          <div
            className={`px-5 lg:px-0 pb-4 pt-3 flex items-end gap-2 ${
              isLanding ? 'max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:mt-auto max-lg:bg-gradient-to-t max-lg:from-[var(--color-bg-base)] max-lg:via-[var(--color-bg-base)]/90 max-lg:to-transparent' : ''
            }`}
          >
            <button
              onClick={handleAttachClick}
              disabled={composerDisabled}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--color-surface-glass)] border border-white/15 text-white/60 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={tc('composer.attach')}
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 relative flex items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={onboarding.awaitingIntention ? t('cards.currentIntention.placeholder') : tc('composer.placeholder')}
                rows={1}
                disabled={composerDisabled}
                className="flex-1 min-w-0 bg-[var(--color-surface-glass)] border border-white/15 rounded-2xl ps-4 pe-20 py-3 text-white placeholder-[var(--color-text-tertiary)] text-base resize-none focus:outline-none focus:border-[var(--color-violet-500)]/60 transition-colors max-h-32"
              />
              <div className="absolute end-3 bottom-3 flex items-center gap-2.5">
                {speechSupported && (
                  <button
                    onClick={toggleDictation}
                    disabled={composerDisabled}
                    className={`transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      listening ? 'text-[var(--color-violet-300)]' : 'text-white/40 hover:text-white/70'
                    }`}
                    aria-label={listening ? tc('composer.stopDictation') : tc('composer.dictate')}
                  >
                    <Mic className="w-[18px] h-[18px]" />
                  </button>
                )}
                <button
                  onClick={handleAttachClick}
                  disabled={composerDisabled}
                  className="text-white/40 hover:text-white/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label={tc('composer.attachImage')}
                >
                  <ImagePlus className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || composerDisabled}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] active:scale-[0.98] disabled:bg-white/10 disabled:cursor-not-allowed text-white transition-all"
              aria-label={tc('composer.send')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 9L16 2L11 16L8 10L2 9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
              </svg>
            </button>
          </div>
          {isLanding && (
            <p className="px-5 lg:px-0 pb-3 text-center text-[var(--color-text-tertiary)] text-xs">
              {tc('privacyNote')}
            </p>
          )}
        </div>

        {/* Right column — desktop only, hidden while onboarding owns the thread (same reasoning as the mobile-only widgets above). */}
        {!onboarding.active && (
          <div className="scrollbar-glass hidden lg:flex lg:flex-col lg:gap-4 lg:pb-6 lg:overflow-y-auto lg:[&>*]:shrink-0">
            <PullACard />
            <RecentConversations
              activeSessionId={sessionId}
              onSelect={handleSelectConversation}
              onCreated={handleNewConversation}
              onDeleted={handleDeletedConversation}
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

/** Marks the most recent user bubble as stored, adopting the server's real timestamp (its sort key). */
function markLastUserPersisted(messages: ChatMessage[], serverCreatedAt: string | undefined): ChatMessage[] {
  if (!serverCreatedAt) return messages
  const lastUser = messages.map((m) => m.role).lastIndexOf('user')
  if (lastUser === -1) return messages
  return messages.map((m, i) => (i === lastUser ? { ...m, createdAt: serverCreatedAt, persisted: true } : m))
}
