'use client'
import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import MirrorRoomLanding from '@/components/mirror/MirrorRoomLanding'
import { DEFAULT_OPENING, openingFromEntry, type MirrorOpening } from '@/components/mirror/openings'
import Step01Situation from '@/components/mirror/Step01Situation'
import Step02AutomaticReaction, { type FeltAnswers } from '@/components/mirror/Step02AutomaticReaction'
import Step03Pattern from '@/components/mirror/Step03Pattern'
import Step04LifeImpact from '@/components/mirror/Step04LifeImpact'
import Step05Synthesis from '@/components/mirror/Step05Synthesis'
import CommitmentScreen from '@/components/mirror/CommitmentScreen'
import CompletionScreen from '@/components/mirror/CompletionScreen'
import DepthMoment, { type DepthMomentKind, type DepthAnswers } from '@/components/mirror/DepthMoment'
import ContainmentPause from '@/components/mirror/ContainmentPause'
import { CreditsExhaustedModal } from '@/components/ui/CreditsExhaustedModal'
import SafetyInterventionScreen from '@/components/shared/SafetyInterventionScreen'
import Sidebar from '@/components/layout/Sidebar'
import type { RefineFn } from '@/lib/useAI'
import { getCurrentSession } from '@/lib/cognito/client'
import { RoomSessionClockProvider } from '@/components/shared/RoomSessionClock'
import { RoomExitProvider } from '@/components/shared/RoomExit'
import { submitRoomCommand, getMirrorFull, ApiError } from '@/lib/api/v1-client'
import type { RoomCommandResponse, MirrorRoomStepId, MirrorEntry, MirrorEmotionFelt, MirrorBodyPlacement } from '@dpnr/shared-types'

/** WELCOME is a client-only intro screen, not a real backend step. */
type MirrorPageStepId = 'WELCOME' | MirrorRoomStepId

/**
 * Client-only screens between backend steps (Mirror depth, #30/#31): a "stay
 * a little longer / continue" moment after Steps 2 and 4, and a pause before
 * the synthesis. The backend is already on the next step while one shows, so
 * the optional depth answers (slice 2) ride on the NEXT command:
 * emotionUnderneath on the PATTERN submit, payoff/deeperBelief/origin on the
 * SYNTHESIS REFINE (no extra paid call). See mirror-steps/helpers.ts.
 */
type Interlude = DepthMomentKind | 'pause'

/** Mirror Room is linear — no lens/options branching, no skip actions on any step (see mirror-steps/*.ts's allowedActions). */
const BACK_MAP: Record<MirrorRoomStepId, MirrorPageStepId | null> = {
  SITUATION: null,
  AUTOMATIC_REACTION: 'SITUATION',
  PATTERN: 'AUTOMATIC_REACTION',
  LIFE_IMPACT: 'PATTERN',
  SYNTHESIS: 'LIFE_IMPACT',
  COMMITMENT: 'SYNTHESIS',
}

interface LocalMirrorState {
  situation: string
  trigger: string
  thought: string
  emotion: string
  bodyResponse: string
  automaticReaction: string
  copingResponse: string
  recurringPattern: string
  energyMoodEffect: string
  lifeDomain: string
  synthesis: string
  commitment: string
  support: string
  emotionsFelt: MirrorEmotionFelt[]
  bodyPlacements: MirrorBodyPlacement[]
  entry?: MirrorEntry
}

type LocalState = LocalMirrorState & DepthAnswers

const INITIAL_STATE: LocalState = {
  situation: '', trigger: '', thought: '', emotion: '', bodyResponse: '', automaticReaction: '',
  copingResponse: '', recurringPattern: '', energyMoodEffect: '', lifeDomain: '', synthesis: '', commitment: '',
  support: '', emotionsFelt: [], bodyPlacements: [],
  emotionUnderneath: '', payoff: '', deeperBelief: '', origin: '',
}

function NewMirrorContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('resume')
  // Intelligence Spec §18/Appendix B "Mirror receives context (topic +
  // domain + source session)" — only set when arriving via a Library
  // topic's "Explore in Mirror Room" action (LibrarySidePanel.tsx).
  // `sourceSessionId` (the Companion session) rides along in the URL too,
  // but isn't consumed here yet — MirrorSessionItem only persists the topic
  // slug this pass (see mirror-room.ts's sourceLibraryTopic doc comment).
  const sourceTopic = params.get('topic')
  const sourceTopicTitle = params.get('topicTitle')

  const [showWelcome, setShowWelcome] = useState(!resumeId)
  const [opening, setOpening] = useState<MirrorOpening>(DEFAULT_OPENING)
  const [resumedArchetype, setResumedArchetype] = useState<string | undefined>(undefined)
  const [completed, setCompleted] = useState(false)
  const [userName, setUserName] = useState('')
  const [state, setState] = useState<LocalState>(INITIAL_STATE)
  const [resumeLoading, setResumeLoading] = useState(!!resumeId)

  const [currentStepId, setCurrentStepId] = useState<MirrorRoomStepId>('SITUATION')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({})
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const [safetyIntervention, setSafetyIntervention] = useState<RoomCommandResponse['safetyIntervention']>(null)
  const [interlude, setInterlude] = useState<Interlude | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const session = await getCurrentSession()
      if (!session) { router.push('/login?next=/mirror/new'); return }
      const email = session.getIdToken().payload.email as string | undefined
      setUserName(email ?? '')
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!resumeId) return
    let ignore = false
    async function loadResume(id: string) {
      try {
        const full = await getMirrorFull(id)
        if (ignore) return
        setSessionId(full.mirrorId)
        setSessionVersion(full.sessionVersion ?? 0)
        setCurrentStepId((full.currentStepId as MirrorRoomStepId) ?? 'SITUATION')
        const resumed = openingFromEntry(full.entry)
        setOpening(resumed.opening)
        setResumedArchetype(resumed.archetype)
        setState({
          situation: full.situation ?? '',
          trigger: full.trigger ?? '',
          thought: full.thought ?? '',
          emotion: full.emotion ?? '',
          bodyResponse: full.bodyResponse ?? '',
          automaticReaction: full.automaticReaction ?? '',
          copingResponse: full.copingResponse ?? '',
          recurringPattern: full.recurringPattern ?? '',
          energyMoodEffect: full.energyMoodEffect ?? '',
          lifeDomain: full.lifeDomain ?? '',
          // Kept since Session 72, so resuming on SYNTHESIS doesn't regenerate (and re-charge) it.
          synthesis: full.synthesis ?? '',
          commitment: full.commitment ?? '',
          support: full.support ?? '',
          emotionUnderneath: full.emotionUnderneath ?? '',
          payoff: full.payoff ?? '',
          deeperBelief: full.deeperBelief ?? '',
          origin: full.origin ?? '',
          emotionsFelt: full.emotionsFelt ?? [],
          bodyPlacements: full.bodyPlacements ?? [],
          entry: full.entry,
        })
        if (full.status === 'completed') setCompleted(true)
      } catch {
        // fall through — start fresh if resume fails, same convention as decision/new/page.tsx
      } finally {
        if (!ignore) setResumeLoading(false)
      }
    }
    loadResume(resumeId)
    return () => { ignore = true }
  }, [resumeId])

  function update(patch: Partial<LocalState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  /**
   * Saves a step's answers locally. If any of them changed, the synthesis no
   * longer describes the session, so it's dropped and SYNTHESIS regenerates
   * it (the backend does the same, see mirror-steps/helpers.ts withAnswers).
   */
  function updateAnswers(patch: Partial<LocalState>) {
    setState(prev => {
      const changed = (Object.keys(patch) as (keyof LocalState)[]).some(
        (key) => JSON.stringify(patch[key] ?? null) !== JSON.stringify(prev[key] ?? null)
      )
      return { ...prev, ...patch, ...(changed ? { synthesis: '' } : {}) }
    })
  }

  async function handleCommandError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401) { router.push('/login?next=/mirror/new'); return }
      if (err.code === 'consent_required') { router.push('/consent?next=/mirror/new'); return }
      if (err.code === 'session_completed') { router.push('/dashboard'); return }
      if (err.code === 'credits_exhausted') { setCreditsExhausted(true); return }
      // Slice 6: Bedrock briefly unavailable — not fatal; the answers are kept and the credit was refunded.
      if (err.code === 'model_unavailable') { setSyncNotice('DPNR is briefly unavailable — nothing was charged and your answers are kept. Please try again in a minute.'); return }
      if (err.code === 'session_version_conflict' && sessionId) {
        try {
          const full = await getMirrorFull(sessionId)
          setSessionVersion(full.sessionVersion ?? sessionVersion)
          setCurrentStepId((full.currentStepId as MirrorRoomStepId) ?? currentStepId)
          setSyncNotice('This session moved on — you’ve been synced to the latest step.')
        } catch {
          setFatalError('Something went wrong. Please go back to InnerOS and try again.')
        }
        return
      }
    }
    setFatalError('Something went wrong. Please go back to InnerOS and try again.')
  }

  async function callCommand(
    stepId: MirrorRoomStepId,
    action: 'SUBMIT_STEP' | 'REFINE',
    input: Record<string, unknown>
  ): Promise<RoomCommandResponse | null> {
    const sid = sessionId ?? crypto.randomUUID()
    if (!sessionId) setSessionId(sid)
    const keyId = `${stepId}:${action}`
    const key = pendingKeys[keyId] ?? crypto.randomUUID()
    if (!pendingKeys[keyId]) setPendingKeys(prev => ({ ...prev, [keyId]: key }))
    try {
      const res = await submitRoomCommand({
        sessionId: sid,
        flowId: 'MIRROR',
        stepId,
        action,
        expectedSessionVersion: sessionVersion,
        idempotencyKey: key,
        input,
      })
      setSessionVersion(res.sessionVersion)
      setPendingKeys(prev => {
        const next = { ...prev }
        delete next[keyId]
        return next
      })
      // Safety/crisis system Stage 2 (docs/SAFETY_SYSTEM_DESIGN.md) — checked
      // on every command response; once set, renderStep() shows
      // SafetyInterventionScreen instead of continuing the normal step flow.
      if (res.safetyIntervention) setSafetyIntervention(res.safetyIntervention)
      return res
    } catch (err) {
      await handleCommandError(err)
      return null
    }
  }

  function submitStep(stepId: MirrorRoomStepId, input: Record<string, unknown>) {
    return callCommand(stepId, 'SUBMIT_STEP', input)
  }

  async function submitStepAndAdvance(stepId: MirrorRoomStepId, input: Record<string, unknown>) {
    const res = await callCommand(stepId, 'SUBMIT_STEP', input)
    if (res?.nextStepId) setCurrentStepId(res.nextStepId as MirrorRoomStepId)
    return res
  }

  function makeRefine(stepId: MirrorRoomStepId): RefineFn {
    return async (refineInput) => {
      // The Step 4 depth answers ride on the synthesis REFINE ('' clears).
      const input = stepId === 'SYNTHESIS'
        ? { ...refineInput, payoff: state.payoff, deeperBelief: state.deeperBelief, origin: state.origin }
        : refineInput
      const res = await callCommand(stepId, 'REFINE', input)
      // The backend saves the synthesis as soon as it's generated; keep the
      // page in step so Back → Continue shows it again instead of regenerating.
      const synthesis = stepId === 'SYNTHESIS' ? res?.result?.synthesis : undefined
      if (typeof synthesis === 'string' && synthesis) update({ synthesis })
      return res?.result ?? null
    }
  }

  // Back from the first step, and the step layout's ✕ on any step, return
  // to the Mirror Room's own main screen rather than leaving the room for
  // Dashboard (founder feedback 2026-09-27). Answers stay in state, so
  // starting again picks up at the same step.
  function returnToMirrorMain() {
    setShowWelcome(true)
  }

  function goBack() {
    const prev = BACK_MAP[currentStepId]
    if (prev && prev !== 'WELCOME') setCurrentStepId(prev)
    else returnToMirrorMain()
  }

  async function completeStep01(situation: string, trigger: string, entry: MirrorEntry) {
    updateAnswers({ situation, trigger, entry })
    await submitStepAndAdvance('SITUATION', { situation, trigger, entry, sourceLibraryTopic: sourceTopic ?? undefined })
  }

  async function completeStep02(answers: FeltAnswers) {
    updateAnswers(answers)
    const res = await submitStepAndAdvance('AUTOMATIC_REACTION', { ...answers })
    if (res?.nextStepId && !res.safetyIntervention) setInterlude('after_felt')
  }

  async function completeStep03(copingResponse: string, recurringPattern: string) {
    updateAnswers({ copingResponse, recurringPattern })
    // The Step 2 depth answer rides on this submit ('' clears).
    await submitStepAndAdvance('PATTERN', { copingResponse, recurringPattern, emotionUnderneath: state.emotionUnderneath })
  }

  async function completeStep04(energyMoodEffect: string, lifeDomain: string) {
    updateAnswers({ energyMoodEffect, lifeDomain })
    const res = await submitStepAndAdvance('LIFE_IMPACT', { energyMoodEffect, lifeDomain })
    if (res?.nextStepId && !res.safetyIntervention) setInterlude('after_impact')
  }

  /** Back from an in-between screen: to the step it followed (or, from the pause, to the depth moment). */
  function interludeBack() {
    if (interlude === 'pause') { setInterlude('after_impact'); return }
    setInterlude(null)
    setCurrentStepId(interlude === 'after_felt' ? 'AUTOMATIC_REACTION' : 'LIFE_IMPACT')
  }

  async function completeStep05(synthesis: string) {
    update({ synthesis })
    await submitStepAndAdvance('SYNTHESIS', {})
  }

  async function finishFlow(commitment: string, support: string) {
    const res = await submitStep('COMMITMENT', { commitment: commitment.trim() || undefined, support: support.trim() })
    if (!res) return
    update({ commitment, support })
    setCompleted(true)
  }

  const sessionTitle = state.situation.trim().slice(0, 40) || 'Mirror Room'

  function renderStep() {
    if (resumeLoading) {
      return (
        <div className="lg:flex lg:min-h-screen">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center min-h-screen">
            <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/mirror-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
            <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
          </main>
        </div>
      )
    }

    if (fatalError) {
      return (
        <div className="lg:flex lg:min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 text-center space-y-4">
            <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/mirror-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
            <p className="text-white/70 text-sm">{fatalError}</p>
            <button onClick={() => router.push('/dashboard')} className="text-purple-400 text-sm underline">
              Back to InnerOS
            </button>
          </main>
        </div>
      )
    }

    if (safetyIntervention) {
      return (
        <SafetyInterventionScreen
          message={safetyIntervention.message}
          safetyState={safetyIntervention.safetyState}
        />
      )
    }

    if (completed) {
      return (
        <CompletionScreen
          userName={userName}
          situation={state.situation}
          trigger={state.trigger}
          emotion={state.emotion}
          bodyResponse={state.bodyResponse}
          emotionsFelt={state.emotionsFelt}
          bodyPlacements={state.bodyPlacements}
          synthesis={state.synthesis}
          commitment={state.commitment}
          onDone={() => router.push('/dashboard')}
        />
      )
    }

    if (showWelcome) {
      return (
        <MirrorRoomLanding
          userName={userName}
          onStart={(o) => {
            setOpening(o)
            setResumedArchetype(undefined)
            setShowWelcome(false)
          }}
          sourceTopicTitle={sourceTopicTitle}
        />
      )
    }

    if (interlude === 'after_felt' || interlude === 'after_impact') {
      return (
        <DepthMoment
          key={interlude}
          kind={interlude}
          sessionTitle={sessionTitle}
          initial={{ emotionUnderneath: state.emotionUnderneath, payoff: state.payoff, deeperBelief: state.deeperBelief, origin: state.origin }}
          onContinue={(answers) => {
            if (answers) updateAnswers(answers)
            setInterlude(interlude === 'after_impact' ? 'pause' : null)
          }}
          onBack={interludeBack}
        />
      )
    }
    if (interlude === 'pause') {
      return <ContainmentPause sessionTitle={sessionTitle} onContinue={() => setInterlude(null)} onBack={interludeBack} />
    }

    switch (currentStepId) {
      case 'SITUATION':
        return (
          <Step01Situation
            initialSituation={state.situation}
            initialTrigger={state.trigger}
            initialArchetype={resumedArchetype}
            opening={opening}
            onComplete={completeStep01}
            onBack={goBack}
          />
        )
      case 'AUTOMATIC_REACTION':
        return (
          <Step02AutomaticReaction
            sessionTitle={sessionTitle}
            initial={{
              thought: state.thought,
              emotion: state.emotion,
              bodyResponse: state.bodyResponse,
              automaticReaction: state.automaticReaction,
              emotionsFelt: state.emotionsFelt,
              bodyPlacements: state.bodyPlacements,
            }}
            onRefine={makeRefine('AUTOMATIC_REACTION')}
            onComplete={completeStep02}
            onBack={goBack}
          />
        )
      case 'PATTERN':
        return (
          <Step03Pattern
            sessionTitle={sessionTitle}
            initialCopingResponse={state.copingResponse}
            initialRecurringPattern={state.recurringPattern}
            entry={state.entry}
            onComplete={completeStep03}
            onBack={goBack}
          />
        )
      case 'LIFE_IMPACT':
        return (
          <Step04LifeImpact
            sessionTitle={sessionTitle}
            initialEnergyMoodEffect={state.energyMoodEffect}
            initialLifeDomain={state.lifeDomain}
            onComplete={completeStep04}
            onBack={goBack}
          />
        )
      case 'SYNTHESIS':
        return (
          <Step05Synthesis
            sessionTitle={sessionTitle}
            initialSynthesis={state.synthesis || undefined}
            onRefine={makeRefine('SYNTHESIS')}
            onComplete={completeStep05}
            onBack={goBack}
          />
        )
      case 'COMMITMENT':
        return (
          <CommitmentScreen
            sessionTitle={sessionTitle}
            initialSupport={state.support}
            onDone={finishFlow}
            onBack={goBack}
          />
        )
      default:
        return (
          <Step01Situation
            initialSituation={state.situation}
            initialTrigger={state.trigger}
            initialArchetype={resumedArchetype}
            opening={opening}
            onComplete={completeStep01}
            onBack={goBack}
          />
        )
    }
  }

  return (
    <>
      {syncNotice && (
        <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
          <button
            onClick={() => setSyncNotice(null)}
            className="bg-purple-900/90 border border-purple-500/40 text-white text-xs rounded-full px-4 py-2 shadow-lg"
          >
            {syncNotice}
          </button>
        </div>
      )}
      {creditsExhausted && <CreditsExhaustedModal onClose={() => setCreditsExhausted(false)} />}
      <RoomExitProvider onExit={returnToMirrorMain}>{renderStep()}</RoomExitProvider>
    </>
  )
}

export default function NewMirrorPage() {
  return (
    <Suspense fallback={
      <div className="lg:flex lg:min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center min-h-screen">
          <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/mirror-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
          <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
        </main>
      </div>
    }>
      <RoomSessionClockProvider>
        <NewMirrorContent />
      </RoomSessionClockProvider>
    </Suspense>
  )
}
