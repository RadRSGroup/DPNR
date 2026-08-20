'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WelcomeScreen from '@/components/mirror/WelcomeScreen'
import Step01Situation from '@/components/mirror/Step01Situation'
import Step02AutomaticReaction from '@/components/mirror/Step02AutomaticReaction'
import Step03Pattern from '@/components/mirror/Step03Pattern'
import Step04LifeImpact from '@/components/mirror/Step04LifeImpact'
import Step05Synthesis from '@/components/mirror/Step05Synthesis'
import CommitmentScreen from '@/components/mirror/CommitmentScreen'
import CompletionScreen from '@/components/mirror/CompletionScreen'
import type { RefineFn } from '@/lib/useAI'
import { getCurrentSession } from '@/lib/cognito/client'
import { submitRoomCommand, getMirrorFull, ApiError } from '@/lib/api/v1-client'
import type { RoomCommandResponse, MirrorRoomStepId } from '@dpnr/shared-types'

/** WELCOME is a client-only intro screen, not a real backend step. */
type MirrorPageStepId = 'WELCOME' | MirrorRoomStepId

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
}

const INITIAL_STATE: LocalMirrorState = {
  situation: '', trigger: '', thought: '', emotion: '', bodyResponse: '', automaticReaction: '',
  copingResponse: '', recurringPattern: '', energyMoodEffect: '', lifeDomain: '', synthesis: '', commitment: '',
}

function NewMirrorContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('resume')

  const [showWelcome, setShowWelcome] = useState(!resumeId)
  const [completed, setCompleted] = useState(false)
  const [userName, setUserName] = useState('')
  const [state, setState] = useState<LocalMirrorState>(INITIAL_STATE)
  const [resumeLoading, setResumeLoading] = useState(!!resumeId)

  const [currentStepId, setCurrentStepId] = useState<MirrorRoomStepId>('SITUATION')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({})
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)

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
          synthesis: '',
          commitment: full.commitment ?? '',
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

  function update(patch: Partial<LocalMirrorState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  async function handleCommandError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401) { router.push('/login?next=/mirror/new'); return }
      if (err.code === 'consent_required') { router.push('/consent?next=/mirror/new'); return }
      if (err.code === 'session_completed') { router.push('/dashboard'); return }
      if (err.code === 'session_version_conflict' && sessionId) {
        try {
          const full = await getMirrorFull(sessionId)
          setSessionVersion(full.sessionVersion ?? sessionVersion)
          setCurrentStepId((full.currentStepId as MirrorRoomStepId) ?? currentStepId)
          setSyncNotice('This session moved on — you’ve been synced to the latest step.')
        } catch {
          setFatalError('Something went wrong. Please go back to the dashboard and try again.')
        }
        return
      }
    }
    setFatalError('Something went wrong. Please go back to the dashboard and try again.')
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
      const res = await callCommand(stepId, 'REFINE', refineInput)
      return res?.result ?? null
    }
  }

  function goBack() {
    const prev = BACK_MAP[currentStepId]
    if (prev && prev !== 'WELCOME') setCurrentStepId(prev)
    else router.push('/dashboard')
  }

  async function completeStep01(situation: string, trigger: string) {
    update({ situation, trigger })
    await submitStepAndAdvance('SITUATION', { situation, trigger })
  }

  async function completeStep02(thought: string, emotion: string, bodyResponse: string, automaticReaction: string) {
    update({ thought, emotion, bodyResponse, automaticReaction })
    await submitStepAndAdvance('AUTOMATIC_REACTION', { thought, emotion, bodyResponse, automaticReaction })
  }

  async function completeStep03(copingResponse: string, recurringPattern: string) {
    update({ copingResponse, recurringPattern })
    await submitStepAndAdvance('PATTERN', { copingResponse, recurringPattern })
  }

  async function completeStep04(energyMoodEffect: string, lifeDomain: string) {
    update({ energyMoodEffect, lifeDomain })
    await submitStepAndAdvance('LIFE_IMPACT', { energyMoodEffect, lifeDomain })
  }

  async function completeStep05(synthesis: string) {
    update({ synthesis })
    await submitStepAndAdvance('SYNTHESIS', {})
  }

  async function finishFlow(commitment: string) {
    const res = await submitStep('COMMITMENT', { commitment: commitment.trim() || undefined })
    if (!res) return
    update({ commitment })
    setCompleted(true)
  }

  const sessionTitle = state.situation.trim().slice(0, 40) || 'Mirror Room'

  function renderStep() {
    if (resumeLoading) {
      return (
        <div className="relative min-h-screen max-w-[393px] mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
          <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )
    }

    if (fatalError) {
      return (
        <div className="relative min-h-screen max-w-[393px] mx-auto flex flex-col items-center justify-center px-6 text-center space-y-4">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
          <p className="text-white/70 text-sm">{fatalError}</p>
          <button onClick={() => router.push('/dashboard')} className="text-purple-400 text-sm underline">
            Back to dashboard
          </button>
        </div>
      )
    }

    if (completed) {
      return (
        <CompletionScreen
          userName={userName}
          situation={state.situation}
          trigger={state.trigger}
          synthesis={state.synthesis}
          commitment={state.commitment}
          onDone={() => router.push('/dashboard')}
        />
      )
    }

    if (showWelcome) {
      return <WelcomeScreen userName={userName} onNext={() => setShowWelcome(false)} />
    }

    switch (currentStepId) {
      case 'SITUATION':
        return (
          <Step01Situation
            initialSituation={state.situation}
            initialTrigger={state.trigger}
            onComplete={completeStep01}
            onBack={goBack}
          />
        )
      case 'AUTOMATIC_REACTION':
        return (
          <Step02AutomaticReaction
            sessionTitle={sessionTitle}
            initialThought={state.thought}
            initialEmotion={state.emotion}
            initialBodyResponse={state.bodyResponse}
            initialAutomaticReaction={state.automaticReaction}
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
            onDone={finishFlow}
            onBack={goBack}
          />
        )
      default:
        return (
          <Step01Situation
            initialSituation={state.situation}
            initialTrigger={state.trigger}
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
      {renderStep()}
    </>
  )
}

export default function NewMirrorPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen max-w-[393px] mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <NewMirrorContent />
    </Suspense>
  )
}
