'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WelcomeScreen from '@/components/decision/WelcomeScreen'
import MomentScreen from '@/components/decision/MomentScreen'
import Step01 from '@/components/decision/Step01'
import Step02 from '@/components/decision/Step02'
import Step03, { type UserResponse } from '@/components/decision/Step03'
import Step04 from '@/components/decision/Step04'
import Step05 from '@/components/decision/Step05'
import Step06 from '@/components/decision/Step06'
import Step07 from '@/components/decision/Step07'
import CompletionScreen from '@/components/decision/CompletionScreen'
import CelebrationScreen from '@/components/decision/CelebrationScreen'
import SectionSummaryScreen, { SummaryType } from '@/components/decision/SectionSummaryScreen'
import SummaryInsightScreen from '@/components/decision/SummaryInsightScreen'
import SessionSummaryScreen from '@/components/decision/SessionSummaryScreen'
import ClarityToActionScreen from '@/components/decision/ClarityToActionScreen'
import CommitmentScreen from '@/components/decision/CommitmentScreen'
import { DecisionOption, Lens } from '@/lib/types'
import type { RefineFn } from '@/lib/useAI'
import { getCurrentSession } from '@/lib/cognito/client'
import { submitRoomCommand, getDecisionFull, ApiError } from '@/lib/api/v1-client'
import type {
  RoomCommandResponse,
  DecisionRoomStepId,
  DecisionRoomSectionSummaryStepId,
  DecisionRoomPostFlowStepId,
} from '@dpnr/shared-types'

/** The 14 symbolic step ids the /v1/rooms/decision command contract knows about — see decision-steps/index.ts. */
type DecisionStepId = DecisionRoomStepId | DecisionRoomSectionSummaryStepId | DecisionRoomPostFlowStepId

/**
 * "Back" target per step, hardcoded rather than derived from flow order —
 * SESSION_SUMMARY is a deliberate exception (goes to FUTURE_PROJECTION, not
 * FUTURE_PROJECTION_SUMMARY), matching the original app's actual behavior:
 * its onBack cleared both postFlow and pendingSummary, which fell through
 * to the Step07 render, skipping the interstitial entirely. Preserved
 * faithfully rather than "fixed."
 */
const BACK_MAP: Record<DecisionStepId, DecisionStepId | null> = {
  NAME_DECISION: null,
  MAP_OPTIONS: 'NAME_DECISION',
  BODY_EMOTION: 'MAP_OPTIONS',
  CHOOSE_LENS: 'BODY_EMOTION',
  DEEP_EXPLORATION: 'CHOOSE_LENS',
  DEEP_EXPLORATION_SUMMARY: 'DEEP_EXPLORATION',
  VALUES_NEEDS: 'DEEP_EXPLORATION_SUMMARY',
  VALUES_NEEDS_SUMMARY: 'VALUES_NEEDS',
  FUTURE_PROJECTION: 'VALUES_NEEDS_SUMMARY',
  FUTURE_PROJECTION_SUMMARY: 'FUTURE_PROJECTION',
  SESSION_SUMMARY: 'FUTURE_PROJECTION',
  SUMMARY_INSIGHT: 'SESSION_SUMMARY',
  CLARITY_ACTION: 'SUMMARY_INSIGHT',
  COMMITMENT: 'CLARITY_ACTION',
}

/**
 * "Skip this step without submitting it" — a purely local jump, no backend
 * call, exactly matching the original's own `skip()` (`currentStep + 1`,
 * never persisted). Only the steps that had an onSkip button in the
 * original are listed. FUTURE_PROJECTION deliberately has none here — the
 * original's own skip() would have advanced past the max step (7 -> 8),
 * hitting the switch's default case and silently resetting to Step01; not
 * worth replicating that latent dead-end, so its top-level Skip button is
 * simply omitted (see the FUTURE_PROJECTION case below).
 */
const SKIP_MAP: Partial<Record<DecisionStepId, DecisionStepId>> = {
  MAP_OPTIONS: 'BODY_EMOTION',
  BODY_EMOTION: 'CHOOSE_LENS',
  CHOOSE_LENS: 'DEEP_EXPLORATION',
  DEEP_EXPLORATION: 'VALUES_NEEDS',
  VALUES_NEEDS: 'FUTURE_PROJECTION',
}

/** Steps from CHOOSE_LENS onward all assume both options exist — same fallback the original had for currentStep >= 4. */
const STEPS_REQUIRING_OPTIONS: DecisionStepId[] = [
  'CHOOSE_LENS', 'DEEP_EXPLORATION', 'DEEP_EXPLORATION_SUMMARY',
  'VALUES_NEEDS', 'VALUES_NEEDS_SUMMARY', 'FUTURE_PROJECTION', 'FUTURE_PROJECTION_SUMMARY',
  'SESSION_SUMMARY', 'SUMMARY_INSIGHT', 'CLARITY_ACTION', 'COMMITMENT',
]

interface LocalDecisionState {
  title: string
  subtitle?: string
  narrative: string
  optionA?: DecisionOption
  optionB?: DecisionOption
  emotionBodyLocation?: string
  emotionColor?: string
  emotionReflection?: string
  lens?: Lens
}

const INITIAL_STATE: LocalDecisionState = { title: '', narrative: '' }

/** Strips the server-built `Leaning: X.` prefix and trailing ` Commitment: ...` suffix a resumed outcome's reflection carries — see future-projection.ts/commitment.ts. */
function parseReflectionNote(reflection?: string | null): string | undefined {
  if (!reflection) return undefined
  const withoutCommitment = reflection.replace(/ Commitment:.*$/, '')
  const withoutLeanPrefix = withoutCommitment.replace(/^Leaning: (A|B|undecided)\.\s*/, '')
  return withoutLeanPrefix.trim() || undefined
}

function NewDecisionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('resume')

  const [introStep, setIntroStep] = useState<-1 | 0 | null>(resumeId ? null : -1)
  const [celebrating, setCelebrating] = useState(false)

  const [sessionData, setSessionData] = useState<{
    tags05?: Record<string, string[]>
    valuesA?: string[]; needsA?: string[]; valuesB?: string[]; needsB?: string[]
    projectionsA?: string[]; projectionsB?: string[]
    chosenLean?: string; reflectionNote?: string
  }>({})

  const [clarityNextStep, setClarityNextStep] = useState('')

  const [completedSummary, setCompletedSummary] = useState<{
    title: string
    optionA?: string
    optionB?: string
    chosenLean?: string
    reflectionNote?: string
    commitment?: string
    decisionId?: string
  } | null>(null)

  const [userName, setUserName] = useState('')
  const [state, setState] = useState<LocalDecisionState>(INITIAL_STATE)
  const [resumeLoading, setResumeLoading] = useState(!!resumeId)

  const [currentStepId, setCurrentStepId] = useState<DecisionStepId>('NAME_DECISION')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionVersion, setSessionVersion] = useState(0)
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({})
  const [syncNotice, setSyncNotice] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const session = await getCurrentSession()
      if (!session) { router.push('/login'); return }
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
        const full = await getDecisionFull(id)
        if (ignore) return

        setSessionId(full.decisionId)
        setSessionVersion(full.sessionVersion ?? 0)
        setCurrentStepId((full.currentStepId as DecisionStepId) ?? 'NAME_DECISION')

        const optA = full.options.find(o => o.label === 'A')
        const optB = full.options.find(o => o.label === 'B')
        const tagsFor = (opt: typeof optA, type: string) =>
          (opt?.tags ?? []).filter(t => t.tagType === type).map(t => t.label)
        const projectionsFor = (opt: typeof optA) =>
          (opt?.projections ?? []).filter(p => p.selected).map(p => p.statement)

        setState({
          title: full.title,
          subtitle: full.subtitle ?? undefined,
          narrative: full.narrative ?? '',
          lens: full.lens ?? undefined,
          optionA: optA ? { label: 'A', content: optA.content, approved: optA.approved } : undefined,
          optionB: optB ? { label: 'B', content: optB.content, approved: optB.approved } : undefined,
          emotionBodyLocation: full.emotion?.bodyLocation ?? undefined,
          emotionColor: full.emotion?.emotionColor ?? undefined,
          emotionReflection: full.emotion?.aiReflection ?? undefined,
        })

        const latestOutcome = full.outcomes[full.outcomes.length - 1]
        setSessionData({
          tags05: {
            pro: tagsFor(optA, 'pro'), con: tagsFor(optA, 'con'), desire: tagsFor(optA, 'desire'), fear: tagsFor(optA, 'fear'),
            B_pro: tagsFor(optB, 'pro'), B_con: tagsFor(optB, 'con'), B_desire: tagsFor(optB, 'desire'), B_fear: tagsFor(optB, 'fear'),
          },
          valuesA: tagsFor(optA, 'value'), needsA: tagsFor(optA, 'need'),
          valuesB: tagsFor(optB, 'value'), needsB: tagsFor(optB, 'need'),
          projectionsA: projectionsFor(optA), projectionsB: projectionsFor(optB),
          chosenLean: latestOutcome ? (latestOutcome.chosenOptionLabel ?? 'undecided') : undefined,
          reflectionNote: parseReflectionNote(latestOutcome?.reflection),
        })
      } catch {
        // fall through — start fresh if resume fails, matching the original's own try/catch fallback
      } finally {
        if (!ignore) setResumeLoading(false)
      }
    }
    loadResume(resumeId)
    return () => { ignore = true }
  }, [resumeId])

  function update(patch: Partial<LocalDecisionState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  async function handleCommandError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401) { router.push('/login?next=/decision/new'); return }
      if (err.code === 'consent_required') { router.push('/consent?next=/decision/new'); return }
      if (err.code === 'session_completed') { router.push('/dashboard'); return }
      if (err.code === 'session_version_conflict' && sessionId) {
        try {
          const full = await getDecisionFull(sessionId)
          setSessionVersion(full.sessionVersion ?? sessionVersion)
          setCurrentStepId((full.currentStepId as DecisionStepId) ?? currentStepId)
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
    stepId: DecisionStepId,
    action: 'SUBMIT_STEP' | 'REFINE' | 'SKIP',
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
        flowId: 'DECISION',
        stepId,
        action,
        expectedSessionVersion: sessionVersion,
        idempotencyKey: key,
        input,
      })
      // Bumped on EVERY successful response, REFINE included — command.ts
      // advances sessionVersion unconditionally, so skipping this on REFINE
      // would 409 the very next SUBMIT_STEP.
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

  function submitStep(stepId: DecisionStepId, input: Record<string, unknown>) {
    return callCommand(stepId, 'SUBMIT_STEP', input)
  }

  async function submitStepAndAdvance(stepId: DecisionStepId, input: Record<string, unknown>) {
    const res = await callCommand(stepId, 'SUBMIT_STEP', input)
    if (res?.nextStepId) setCurrentStepId(res.nextStepId as DecisionStepId)
    return res
  }

  function makeRefine(stepId: DecisionStepId): RefineFn {
    return async (refineInput) => {
      const res = await callCommand(stepId, 'REFINE', refineInput)
      return res?.result ?? null
    }
  }

  function goBack() {
    const prev = BACK_MAP[currentStepId]
    if (prev) setCurrentStepId(prev)
    else router.push('/dashboard')
  }

  function skipStep() {
    const next = SKIP_MAP[currentStepId]
    if (next) setCurrentStepId(next)
  }

  async function completeStep01(title: string, subtitle?: string) {
    update({ title, subtitle })
    await submitStepAndAdvance('NAME_DECISION', { title, subtitle })
  }

  async function completeStep02(narrative: string, optionA: DecisionOption, optionB: DecisionOption) {
    update({ narrative, optionA, optionB })
    await submitStepAndAdvance('MAP_OPTIONS', {
      narrative,
      optionA: { content: optionA.content, approved: optionA.approved },
      optionB: { content: optionB.content, approved: optionB.approved },
    })
  }

  async function completeStep03(bodyLocation: string, emotion: string, reflection: string, response: UserResponse, userRefinement?: string) {
    update({ emotionBodyLocation: bodyLocation, emotionColor: emotion, emotionReflection: reflection })
    await submitStepAndAdvance('BODY_EMOTION', {
      bodyLocation, emotionColor: emotion, aiReflection: reflection, response, userRefinement,
    })
  }

  async function completeStep04(lens: Lens) {
    update({ lens })
    await submitStepAndAdvance('CHOOSE_LENS', { lens })
  }

  async function completeStep05(tags: Record<string, string[]>) {
    const toEntries = (arr?: string[]) => (arr ?? []).map(label => ({ label, aiSuggested: false }))
    setSessionData(prev => ({
      ...prev,
      tags05: {
        pro: tags.A_pro ?? [], con: tags.A_con ?? [], desire: tags.A_desire ?? [], fear: tags.A_fear ?? [],
        B_pro: tags.B_pro ?? [], B_con: tags.B_con ?? [], B_desire: tags.B_desire ?? [], B_fear: tags.B_fear ?? [],
      },
    }))
    await submitStepAndAdvance('DEEP_EXPLORATION', {
      tagsA: { pro: toEntries(tags.A_pro), con: toEntries(tags.A_con), desire: toEntries(tags.A_desire), fear: toEntries(tags.A_fear) },
      tagsB: { pro: toEntries(tags.B_pro), con: toEntries(tags.B_con), desire: toEntries(tags.B_desire), fear: toEntries(tags.B_fear) },
    })
  }

  async function completeStep06(valuesA: string[], needsA: string[], valuesB: string[], needsB: string[]) {
    const toEntries = (arr: string[]) => arr.map(label => ({ label, aiSuggested: false }))
    setSessionData(prev => ({ ...prev, valuesA, needsA, valuesB, needsB }))
    await submitStepAndAdvance('VALUES_NEEDS', {
      valuesA: toEntries(valuesA), needsA: toEntries(needsA), valuesB: toEntries(valuesB), needsB: toEntries(needsB),
    })
  }

  async function completeStep07(projectionsA: string[], projectionsB: string[], chosenLean?: string, reflectionNote?: string) {
    const toEntries = (arr: string[]) => arr.map(statement => ({ statement, isCustom: false }))
    setSessionData(prev => ({ ...prev, projectionsA, projectionsB, chosenLean, reflectionNote }))
    await submitStepAndAdvance('FUTURE_PROJECTION', {
      projectionsA: toEntries(projectionsA),
      projectionsB: toEntries(projectionsB),
      chosenLean: chosenLean ?? 'undecided',
      reflectionNote,
    })
  }

  async function handleClarityCommit(nextStep: string) {
    setClarityNextStep(nextStep)
    await submitStepAndAdvance('CLARITY_ACTION', { nextStep })
  }

  async function handleClaritySkip() {
    setClarityNextStep('')
    const res = await callCommand('CLARITY_ACTION', 'SKIP', {})
    if (res?.nextStepId) setCurrentStepId(res.nextStepId as DecisionStepId)
  }

  async function finishFlow(commitment: string) {
    const res = await submitStep('COMMITMENT', { commitment: commitment.trim() || undefined })
    if (!res) return
    setCompletedSummary({
      title: state.title,
      optionA: state.optionA?.content,
      optionB: state.optionB?.content,
      chosenLean: sessionData.chosenLean,
      reflectionNote: sessionData.reflectionNote,
      commitment,
      decisionId: sessionId ?? undefined,
    })
    setCelebrating(true)
  }

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
            Back to InnerOS
          </button>
        </div>
      )
    }

    if (completedSummary && celebrating) {
      return (
        <CelebrationScreen
          userName={userName}
          decisionTitle={completedSummary.title}
          onContinue={() => setCelebrating(false)}
        />
      )
    }

    if (completedSummary) {
      return (
        <CompletionScreen
          userName={userName}
          decisionTitle={completedSummary.title}
          optionA={completedSummary.optionA}
          optionB={completedSummary.optionB}
          chosenLean={completedSummary.chosenLean}
          reflectionNote={completedSummary.reflectionNote}
          commitment={completedSummary.commitment}
          decisionId={completedSummary.decisionId}
          onDone={() => router.push('/dashboard?completed=true')}
        />
      )
    }

    if (introStep === -1) {
      return <WelcomeScreen userName={userName} onNext={() => setIntroStep(0)} />
    }

    if (introStep === 0) {
      return <MomentScreen onNext={() => setIntroStep(null)} onBack={() => setIntroStep(-1)} />
    }

    if (STEPS_REQUIRING_OPTIONS.includes(currentStepId) && (!state.optionA || !state.optionB)) {
      return (
        <Step02
          decisionTitle={state.title}
          initialNarrative={state.narrative}
          onRefine={makeRefine('MAP_OPTIONS')}
          onComplete={completeStep02}
          onBack={goBack}
          onSkip={skipStep}
        />
      )
    }

    switch (currentStepId) {
      case 'NAME_DECISION':
        return (
          <Step01
            initialTitle={state.title}
            initialSubtitle={state.subtitle}
            onRefine={makeRefine('NAME_DECISION')}
            onComplete={completeStep01}
            onBack={goBack}
          />
        )
      case 'MAP_OPTIONS':
        return (
          <Step02
            decisionTitle={state.title}
            initialNarrative={state.narrative}
            initialOptionA={state.optionA}
            initialOptionB={state.optionB}
            onRefine={makeRefine('MAP_OPTIONS')}
            onComplete={completeStep02}
            onBack={goBack}
            onSkip={skipStep}
          />
        )
      case 'BODY_EMOTION':
        return (
          <Step03
            decisionTitle={state.title}
            initialBodyLocation={state.emotionBodyLocation}
            initialEmotion={state.emotionColor}
            initialReflection={state.emotionReflection}
            onRefine={makeRefine('BODY_EMOTION')}
            onComplete={completeStep03}
            onBack={goBack}
            onSkip={skipStep}
          />
        )
      case 'CHOOSE_LENS':
        return (
          <Step04
            decisionTitle={state.title}
            optionA={state.optionA!}
            optionB={state.optionB!}
            initialLens={state.lens}
            onComplete={completeStep04}
            onBack={goBack}
            onSkip={skipStep}
          />
        )
      case 'DEEP_EXPLORATION':
        return (
          <Step05
            decisionTitle={state.title}
            optionA={state.optionA!}
            optionB={state.optionB!}
            lens={state.lens ?? 'pros_cons'}
            initialTagsA={sessionData.tags05 ? {
              pro: sessionData.tags05.pro ?? [], con: sessionData.tags05.con ?? [],
              desire: sessionData.tags05.desire ?? [], fear: sessionData.tags05.fear ?? [],
            } : undefined}
            initialTagsB={sessionData.tags05 ? {
              pro: sessionData.tags05.B_pro ?? [], con: sessionData.tags05.B_con ?? [],
              desire: sessionData.tags05.B_desire ?? [], fear: sessionData.tags05.B_fear ?? [],
            } : undefined}
            onRefine={makeRefine('DEEP_EXPLORATION')}
            onComplete={completeStep05}
            onBack={goBack}
            onSkip={skipStep}
          />
        )
      case 'DEEP_EXPLORATION_SUMMARY': {
        const summaryType: SummaryType = (state.lens ?? 'pros_cons') === 'pros_cons' ? 'pros_cons' : 'fears_desires'
        return (
          <SectionSummaryScreen
            decisionTitle={state.title}
            stepType={summaryType}
            tagsA={{
              pro: sessionData.tags05?.pro ?? [], con: sessionData.tags05?.con ?? [],
              desire: sessionData.tags05?.desire ?? [], fear: sessionData.tags05?.fear ?? [],
            }}
            tagsB={{
              pro: sessionData.tags05?.B_pro ?? [], con: sessionData.tags05?.B_con ?? [],
              desire: sessionData.tags05?.B_desire ?? [], fear: sessionData.tags05?.B_fear ?? [],
            }}
            onRefine={makeRefine('DEEP_EXPLORATION_SUMMARY')}
            onContinue={() => submitStepAndAdvance('DEEP_EXPLORATION_SUMMARY', {})}
            onBack={goBack}
          />
        )
      }
      case 'VALUES_NEEDS':
        return (
          <Step06
            decisionTitle={state.title}
            optionA={state.optionA!}
            optionB={state.optionB!}
            initialValuesA={sessionData.valuesA}
            initialNeedsA={sessionData.needsA}
            initialValuesB={sessionData.valuesB}
            initialNeedsB={sessionData.needsB}
            onRefine={makeRefine('VALUES_NEEDS')}
            onComplete={completeStep06}
            onBack={goBack}
            onSkip={skipStep}
          />
        )
      case 'VALUES_NEEDS_SUMMARY':
        return (
          <SectionSummaryScreen
            decisionTitle={state.title}
            stepType="values_needs"
            tagsA={{ values: sessionData.valuesA ?? [], needs: sessionData.needsA ?? [] }}
            tagsB={{ values: sessionData.valuesB ?? [], needs: sessionData.needsB ?? [] }}
            onRefine={makeRefine('VALUES_NEEDS_SUMMARY')}
            onContinue={() => submitStepAndAdvance('VALUES_NEEDS_SUMMARY', {})}
            onBack={goBack}
          />
        )
      case 'FUTURE_PROJECTION':
        return (
          <Step07
            decisionTitle={state.title}
            optionA={state.optionA!}
            optionB={state.optionB!}
            initialSelectedA={sessionData.projectionsA}
            initialSelectedB={sessionData.projectionsB}
            initialChosenLean={sessionData.chosenLean}
            initialReflectionNote={sessionData.reflectionNote}
            onRefine={makeRefine('FUTURE_PROJECTION')}
            onComplete={completeStep07}
            onBack={goBack}
          />
        )
      case 'FUTURE_PROJECTION_SUMMARY':
        return (
          <SectionSummaryScreen
            decisionTitle={state.title}
            stepType="projections"
            tagsA={{ projections: sessionData.projectionsA ?? [] }}
            tagsB={{ projections: sessionData.projectionsB ?? [] }}
            onRefine={makeRefine('FUTURE_PROJECTION_SUMMARY')}
            onContinue={() => submitStepAndAdvance('FUTURE_PROJECTION_SUMMARY', {})}
            onBack={goBack}
          />
        )
      case 'SESSION_SUMMARY':
        return (
          <SessionSummaryScreen
            decisionTitle={state.title}
            onRefine={makeRefine('SESSION_SUMMARY')}
            onContinue={() => submitStepAndAdvance('SESSION_SUMMARY', {})}
            onBack={goBack}
          />
        )
      case 'SUMMARY_INSIGHT':
        return (
          <SummaryInsightScreen
            decisionTitle={state.title}
            onRefine={makeRefine('SUMMARY_INSIGHT')}
            onContinue={() => submitStepAndAdvance('SUMMARY_INSIGHT', {})}
            onBack={goBack}
          />
        )
      case 'CLARITY_ACTION':
        return (
          <ClarityToActionScreen
            decisionTitle={state.title}
            onRefine={makeRefine('CLARITY_ACTION')}
            onCommit={handleClarityCommit}
            onSkip={handleClaritySkip}
            onBack={goBack}
          />
        )
      case 'COMMITMENT':
        return (
          <CommitmentScreen
            decisionTitle={state.title}
            nextStep={clarityNextStep || undefined}
            onDone={finishFlow}
            onBack={goBack}
          />
        )
      default:
        return (
          <Step01
            initialTitle={state.title}
            initialSubtitle={state.subtitle}
            onRefine={makeRefine('NAME_DECISION')}
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

export default function NewDecisionPage() {
  return (
    <Suspense fallback={
      <div className="relative min-h-screen max-w-[393px] mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <NewDecisionContent />
    </Suspense>
  )
}
