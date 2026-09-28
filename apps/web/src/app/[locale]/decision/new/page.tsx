'use client'
import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useSearchParams } from 'next/navigation'
import DecisionRoomLanding from '@/components/decision/DecisionRoomLanding'
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
import { CreditsExhaustedModal } from '@/components/ui/CreditsExhaustedModal'
import SafetyInterventionScreen from '@/components/shared/SafetyInterventionScreen'
import Sidebar from '@/components/layout/Sidebar'
import { DecisionOption, Lens, OptionLabel } from '@/lib/types'
import type { RefineFn } from '@/lib/useAI'
import { getCurrentSession } from '@/lib/cognito/client'
import { feltFromDecisionEmotion, type Felt } from '@/lib/body-map'
import { RoomSessionClockProvider } from '@/components/shared/RoomSessionClock'
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
  // Each lens starts from, and its summary returns to, Choose Your Lens
  // (all three lenses, any order: founder feedback 2026-09-28 #6/#7).
  VALUES_NEEDS: 'CHOOSE_LENS',
  VALUES_NEEDS_SUMMARY: 'VALUES_NEEDS',
  FUTURE_PROJECTION: 'CHOOSE_LENS',
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
  // CHOOSE_LENS has its own Continue (Step04 → continueFromLenses).
  DEEP_EXPLORATION: 'CHOOSE_LENS',
  VALUES_NEEDS: 'CHOOSE_LENS',
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
  /** The optional third option (2026-09-28 #2). */
  optionC?: DecisionOption
  emotionFelt?: Felt
  emotionReflection?: string
  lens?: Lens
  /** Lenses already explored, in order (#6/#7). */
  completedLenses?: Lens[]
}

const INITIAL_STATE: LocalDecisionState = { title: '', narrative: '' }

type PerOption<T> = Partial<Record<OptionLabel, T>>
const toTagEntries = (arr?: string[]) => (arr ?? []).map(label => ({ label, aiSuggested: false }))
const toProjectionEntries = (arr?: string[]) => (arr ?? []).map(statement => ({ statement, isCustom: false }))

/** Strips the server-built `Leaning: X.` prefix and trailing ` Commitment: ...` suffix a resumed outcome's reflection carries — see future-projection.ts/commitment.ts. */
function parseReflectionNote(reflection?: string | null): string | undefined {
  if (!reflection) return undefined
  const withoutCommitment = reflection.replace(/ Commitment:.*$/, '')
  const withoutLeanPrefix = withoutCommitment.replace(/^Leaning: (A|B|C|undecided)\.\s*/, '')
  return withoutLeanPrefix.trim() || undefined
}

function NewDecisionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('resume')
  // Intelligence Spec §18/Appendix B — only set when arriving via a Library
  // topic's "Explore in Decision Room" action (LibrarySidePanel.tsx).
  // `sourceSessionId` rides along in the URL too but isn't consumed here
  // yet — DecisionItem only persists the topic slug this pass.
  const sourceTopic = params.get('topic')
  const sourceTopicTitle = params.get('topicTitle')

  const [introStep, setIntroStep] = useState<-1 | 0 | null>(resumeId ? null : -1)
  const [celebrating, setCelebrating] = useState(false)

  // Per option (A, B, and C when there is one): Step05 tags by type, Step06
  // values/needs, Step07 kept projections.
  const [sessionData, setSessionData] = useState<{
    tags05?: PerOption<Record<string, string[]>>
    values?: PerOption<string[]>
    needs?: PerOption<string[]>
    projections?: PerOption<string[]>
    chosenLean?: string; reflectionNote?: string
  }>({})

  const [clarityNextStep, setClarityNextStep] = useState('')

  const [completedSummary, setCompletedSummary] = useState<{
    title: string
    optionA?: string
    optionB?: string
    optionC?: string
    chosenLean?: string
    reflectionNote?: string
    commitment?: string
    decisionId?: string
    felt?: Felt
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
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const [safetyIntervention, setSafetyIntervention] = useState<RoomCommandResponse['safetyIntervention']>(null)

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
        const optC = full.options.find(o => o.label === 'C')
        const tagsFor = (opt: typeof optA, type: string) =>
          (opt?.tags ?? []).filter(t => t.tagType === type).map(t => t.label)
        const projectionsFor = (opt: typeof optA) =>
          (opt?.projections ?? []).filter(p => p.selected).map(p => p.statement)
        const perOption = <T,>(read: (opt: typeof optA) => T): PerOption<T> =>
          Object.fromEntries(full.options.map(o => [o.label, read(o)]))

        setState({
          title: full.title,
          subtitle: full.subtitle ?? undefined,
          narrative: full.narrative ?? '',
          lens: full.lens ?? undefined,
          completedLenses: full.completedLenses ?? [],
          optionA: optA ? { label: 'A', content: optA.content, approved: optA.approved } : undefined,
          optionB: optB ? { label: 'B', content: optB.content, approved: optB.approved } : undefined,
          optionC: optC ? { label: 'C', content: optC.content, approved: optC.approved } : undefined,
          emotionFelt: full.emotion ? feltFromDecisionEmotion(full.emotion) : undefined,
          emotionReflection: full.emotion?.aiReflection ?? undefined,
        })

        const latestOutcome = full.outcomes[full.outcomes.length - 1]
        setSessionData({
          tags05: perOption(o => ({ pro: tagsFor(o, 'pro'), con: tagsFor(o, 'con'), desire: tagsFor(o, 'desire'), fear: tagsFor(o, 'fear') })),
          values: perOption(o => tagsFor(o, 'value')),
          needs: perOption(o => tagsFor(o, 'need')),
          projections: perOption(projectionsFor),
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
      if (err.code === 'credits_exhausted') { setCreditsExhausted(true); return }
      // Slice 6: Bedrock briefly unavailable — not fatal; the answers are kept and the credit was refunded.
      if (err.code === 'model_unavailable') { setSyncNotice('DPNR is briefly unavailable — nothing was charged and your answers are kept. Please try again in a minute.'); return }
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
      // Safety/crisis system Stage 2 (docs/SAFETY_SYSTEM_DESIGN.md) — checked
      // on every command response; once set, renderStep() shows
      // SafetyInterventionScreen instead of continuing the normal step flow,
      // and stays that way for the rest of this session (no "keep going").
      if (res.safetyIntervention) setSafetyIntervention(res.safetyIntervention)
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
    await submitStepAndAdvance('NAME_DECISION', { title, subtitle, sourceLibraryTopic: sourceTopic ?? undefined })
  }

  async function completeStep02(narrative: string, options: DecisionOption[]) {
    const [optionA, optionB, optionC] = options
    update({ narrative, optionA, optionB, optionC })
    if (!optionC) {
      // Removing C also removes what was recorded for it (map-options.ts does the same server-side).
      const drop = <T,>(m?: PerOption<T>) => (m ? { ...m, C: undefined } : m)
      setSessionData(prev => ({ ...prev, tags05: drop(prev.tags05), values: drop(prev.values), needs: drop(prev.needs), projections: drop(prev.projections) }))
    }
    await submitStepAndAdvance('MAP_OPTIONS', {
      narrative,
      optionA: { content: optionA.content, approved: optionA.approved },
      optionB: { content: optionB.content, approved: optionB.approved },
      ...(optionC ? { optionC: { content: optionC.content, approved: optionC.approved } } : {}),
    })
  }

  async function completeStep03(felt: Felt, reflection: string, response: UserResponse, userRefinement?: string) {
    update({ emotionFelt: felt, emotionReflection: reflection })
    await submitStepAndAdvance('BODY_EMOTION', {
      ...felt, aiReflection: reflection, response, userRefinement,
    })
  }

  async function completeStep04(lens: Lens) {
    update({ lens })
    await submitStepAndAdvance('CHOOSE_LENS', { lens })
  }

  /** Leave the lens cards for Future Projection. Needs the 2026-09-28 backend (`continue`), so deploy it before this frontend. */
  async function continueFromLenses() {
    const res = await callCommand('CHOOSE_LENS', 'SUBMIT_STEP', { continue: true })
    if (res?.nextStepId) setCurrentStepId(res.nextStepId as DecisionStepId)
  }

  /** A lens summary was dismissed: remember the lens as explored, then follow the server (back to the cards). */
  async function completeLensSummary(stepId: 'DEEP_EXPLORATION_SUMMARY' | 'VALUES_NEEDS_SUMMARY') {
    const done: Lens = stepId === 'VALUES_NEEDS_SUMMARY' ? 'values_needs' : state.lens === 'pros_cons' ? 'pros_cons' : 'fears_desires'
    const res = await submitStepAndAdvance(stepId, {})
    if (res) setState((prev) => ({ ...prev, completedLenses: [...new Set([...(prev.completedLenses ?? []), done])] }))
  }

  async function completeStep05(tags: PerOption<Record<string, string[]>>) {
    setSessionData(prev => ({ ...prev, tags05: tags }))
    const bucket = (label: OptionLabel) => {
      const t = tags[label] ?? {}
      return { pro: toTagEntries(t.pro), con: toTagEntries(t.con), desire: toTagEntries(t.desire), fear: toTagEntries(t.fear) }
    }
    await submitStepAndAdvance('DEEP_EXPLORATION', {
      tagsA: bucket('A'),
      tagsB: bucket('B'),
      ...(state.optionC ? { tagsC: bucket('C') } : {}),
    })
  }

  async function completeStep06(values: PerOption<string[]>, needs: PerOption<string[]>) {
    setSessionData(prev => ({ ...prev, values, needs }))
    await submitStepAndAdvance('VALUES_NEEDS', {
      valuesA: toTagEntries(values.A), needsA: toTagEntries(needs.A),
      valuesB: toTagEntries(values.B), needsB: toTagEntries(needs.B),
      ...(state.optionC ? { valuesC: toTagEntries(values.C), needsC: toTagEntries(needs.C) } : {}),
    })
  }

  async function completeStep07(projections: PerOption<string[]>, chosenLean?: string, reflectionNote?: string) {
    setSessionData(prev => ({ ...prev, projections, chosenLean, reflectionNote }))
    await submitStepAndAdvance('FUTURE_PROJECTION', {
      projectionsA: toProjectionEntries(projections.A),
      projectionsB: toProjectionEntries(projections.B),
      ...(state.optionC ? { projectionsC: toProjectionEntries(projections.C) } : {}),
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
      optionC: state.optionC?.content,
      chosenLean: sessionData.chosenLean,
      reflectionNote: sessionData.reflectionNote,
      commitment,
      decisionId: sessionId ?? undefined,
      felt: state.emotionFelt,
    })
    setCelebrating(true)
  }

  // A, B and (when there is one) C, in order — what every per-option screen iterates.
  const options = [state.optionA, state.optionB, state.optionC].filter((o): o is DecisionOption => !!o)

  function renderStep() {
    if (resumeLoading) {
      return (
        <div className="lg:flex lg:min-h-screen">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center min-h-screen">
            <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
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
        <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
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
          optionC={completedSummary.optionC}
          chosenLean={completedSummary.chosenLean}
          reflectionNote={completedSummary.reflectionNote}
          commitment={completedSummary.commitment}
          decisionId={completedSummary.decisionId}
          felt={completedSummary.felt}
          onDone={() => router.push('/dashboard?completed=true')}
        />
      )
    }

    if (introStep === -1) {
      return <DecisionRoomLanding userName={userName} onStart={() => setIntroStep(0)} sourceTopicTitle={sourceTopicTitle} />
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
            initialOptionC={state.optionC}
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
            initialFelt={state.emotionFelt}
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
            options={options}
            initialLens={state.lens}
            completedLenses={state.completedLenses}
            onComplete={completeStep04}
            onContinue={continueFromLenses}
            onBack={goBack}
          />
        )
      case 'DEEP_EXPLORATION':
        return (
          <Step05
            decisionTitle={state.title}
            options={options}
            lens={state.lens ?? 'pros_cons'}
            initialTags={sessionData.tags05}
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
            options={options}
            stepType={summaryType}
            tags={sessionData.tags05 ?? {}}
            onRefine={makeRefine('DEEP_EXPLORATION_SUMMARY')}
            onContinue={() => completeLensSummary('DEEP_EXPLORATION_SUMMARY')}
            onBack={goBack}
          />
        )
      }
      case 'VALUES_NEEDS':
        return (
          <Step06
            decisionTitle={state.title}
            options={options}
            initialValues={sessionData.values}
            initialNeeds={sessionData.needs}
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
            options={options}
            stepType="values_needs"
            tags={Object.fromEntries(options.map(o => [o.label, { values: sessionData.values?.[o.label] ?? [], needs: sessionData.needs?.[o.label] ?? [] }]))}
            onRefine={makeRefine('VALUES_NEEDS_SUMMARY')}
            onContinue={() => completeLensSummary('VALUES_NEEDS_SUMMARY')}
            onBack={goBack}
          />
        )
      case 'FUTURE_PROJECTION':
        return (
          <Step07
            decisionTitle={state.title}
            options={options}
            initialSelected={sessionData.projections}
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
            options={options}
            stepType="projections"
            tags={Object.fromEntries(options.map(o => [o.label, { projections: sessionData.projections?.[o.label] ?? [] }]))}
            onRefine={makeRefine('FUTURE_PROJECTION_SUMMARY')}
            onContinue={() => submitStepAndAdvance('FUTURE_PROJECTION_SUMMARY', {})}
            onBack={goBack}
          />
        )
      case 'SESSION_SUMMARY':
        return (
          <SessionSummaryScreen
            decisionTitle={state.title}
            felt={state.emotionFelt}
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
      {creditsExhausted && <CreditsExhaustedModal onClose={() => setCreditsExhausted(false)} />}
      {renderStep()}
    </>
  )
}

export default function NewDecisionPage() {
  return (
    <Suspense fallback={
      <div className="lg:flex lg:min-h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center min-h-screen">
          <div className="absolute inset-0 -z-10">
        <Image src="/images/backgrounds/decision-bg.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-bg-base)]" />
      </div>
          <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
        </main>
      </div>
    }>
      <RoomSessionClockProvider>
        <NewDecisionContent />
      </RoomSessionClockProvider>
    </Suspense>
  )
}
