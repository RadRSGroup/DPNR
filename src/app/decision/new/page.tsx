'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import WelcomeScreen from '@/components/decision/WelcomeScreen'
import MomentScreen from '@/components/decision/MomentScreen'
import Step01 from '@/components/decision/Step01'
import Step02 from '@/components/decision/Step02'
import Step03 from '@/components/decision/Step03'
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
import { DecisionState, DecisionOption, Lens, EmotionColor } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  createDecision,
  updateDecision,
  upsertOptions,
  saveEmotionMap,
  saveOptionTags,
  saveProjections,
  addOutcome,
} from '@/lib/supabase/decisions'

const INITIAL_STATE: DecisionState = {
  title: '',
  narrative: '',
  currentStep: 1,
}

function NewDecisionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const resumeId = params.get('resume')

  const [introStep, setIntroStep] = useState<-1 | 0 | null>(resumeId ? null : -1)
  const [pendingSummary, setPendingSummary] = useState<{
    type: SummaryType
    tagsA: Record<string, string[]>
    tagsB: Record<string, string[]>
    onConfirm: () => void
  } | null>(null)
  const [celebrating, setCelebrating] = useState(false)

  // Session data accumulated across steps for end-of-flow screens
  const [sessionData, setSessionData] = useState<{
    tags05?: Record<string, string[]>
    valuesA?: string[]; needsA?: string[]; valuesB?: string[]; needsB?: string[]
    projectionsA?: string[]; projectionsB?: string[]
    chosenLean?: string; reflectionNote?: string
  }>({})

  // Post-flow screen state
  type PostFlow = 'session_summary' | 'insight' | 'clarity_action' | 'commitment' | null
  const [postFlow, setPostFlow] = useState<PostFlow>(null)
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
  const [state, setState] = useState<DecisionState>(INITIAL_STATE)
  const [optionIds, setOptionIds] = useState<{ idA?: string; idB?: string }>({})
  const [resumeLoading, setResumeLoading] = useState(!!resumeId)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const name = user.user_metadata?.full_name || user.email || ''
      setUserName(name)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!resumeId) return
    async function loadResume() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('decisions')
          .select(`id, title, subtitle, narrative, current_step, lens,
            options ( id, label, content, approved )`)
          .eq('id', resumeId)
          .single()
        if (!data) return

        const optA = data.options?.find((o: { label: string }) => o.label === 'A')
        const optB = data.options?.find((o: { label: string }) => o.label === 'B')

        setState({
          id: data.id,
          title: data.title ?? '',
          subtitle: data.subtitle ?? undefined,
          narrative: data.narrative ?? '',
          currentStep: data.current_step ?? 1,
          lens: (data.lens as Lens) ?? undefined,
          optionA: optA ? { label: 'A', content: optA.content, approved: optA.approved } : undefined,
          optionB: optB ? { label: 'B', content: optB.content, approved: optB.approved } : undefined,
        })
        if (optA && optB) {
          setOptionIds({ idA: optA.id, idB: optB.id })
        }
      } catch {
        // fall through — start fresh if load fails
      } finally {
        setResumeLoading(false)
      }
    }
    loadResume()
  }, [resumeId])

  if (resumeLoading) {
    return (
      <div className="relative min-h-screen max-w-[393px] mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
        <div className="w-8 h-8 border-2 border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Post-flow screens (Step 08 → 09 → 10 → Last Step) ──
  if (postFlow === 'session_summary' && state.optionA && state.optionB) {
    return (
      <SessionSummaryScreen
        decisionTitle={state.title}
        narrative={state.narrative}
        optionA={state.optionA.content}
        optionB={state.optionB.content}
        emotionColor={state.emotionColor}
        emotionBodyLocation={state.emotionBodyLocation}
        emotionReflection={state.emotionReflection}
        tagsA={{ pro: sessionData.tags05?.pro ?? [], con: sessionData.tags05?.con ?? [], desire: sessionData.tags05?.desire ?? [], fear: sessionData.tags05?.fear ?? [] }}
        tagsB={{ pro: sessionData.tags05?.B_pro ?? [], con: sessionData.tags05?.B_con ?? [], desire: sessionData.tags05?.B_desire ?? [], fear: sessionData.tags05?.B_fear ?? [] }}
        valuesA={sessionData.valuesA}
        needsA={sessionData.needsA}
        valuesB={sessionData.valuesB}
        needsB={sessionData.needsB}
        projectionsA={sessionData.projectionsA}
        projectionsB={sessionData.projectionsB}
        chosenLean={sessionData.chosenLean}
        decisionId={state.id}
        onContinue={() => setPostFlow('insight')}
        onBack={() => { setPostFlow(null); setPendingSummary(null) }}
      />
    )
  }

  if (postFlow === 'insight' && state.optionA && state.optionB) {
    const allTags = [...(sessionData.projectionsA ?? []), ...(sessionData.projectionsB ?? [])]
    return (
      <SummaryInsightScreen
        decisionTitle={state.title}
        narrative={state.narrative}
        optionA={state.optionA.content}
        optionB={state.optionB.content}
        allTags={allTags}
        decisionId={state.id}
        onContinue={() => setPostFlow('clarity_action')}
        onBack={() => setPostFlow('session_summary')}
      />
    )
  }

  if (postFlow === 'clarity_action' && state.optionA && state.optionB) {
    return (
      <ClarityToActionScreen
        decisionTitle={state.title}
        narrative={state.narrative}
        optionA={state.optionA.content}
        optionB={state.optionB.content}
        chosenLean={sessionData.chosenLean}
        decisionId={state.id}
        onCommit={(nextStep) => { setClarityNextStep(nextStep); setPostFlow('commitment') }}
        onSkip={() => setPostFlow('commitment')}
        onBack={() => setPostFlow('insight')}
      />
    )
  }

  if (postFlow === 'commitment') {
    return (
      <CommitmentScreen
        decisionTitle={state.title}
        nextStep={clarityNextStep || undefined}
        onDone={finishFlow}
        onBack={() => setPostFlow('clarity_action')}
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

  function update(patch: Partial<DecisionState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  function goBack() {
    if (state.currentStep > 1) update({ currentStep: state.currentStep - 1 })
    else router.push('/dashboard')
  }

  function skip() {
    update({ currentStep: state.currentStep + 1 })
  }

  async function completeStep01(title: string, subtitle?: string) {
    try {
      const id = await createDecision(title, subtitle)
      update({ title, subtitle, id, currentStep: 2 })
    } catch (e) {
      console.error('createDecision error:', e)
      update({ title, subtitle, currentStep: 2 })
    }
  }

  async function completeStep02(narrative: string, optionA: DecisionOption, optionB: DecisionOption) {
    update({ narrative, optionA, optionB, currentStep: 3 })
    if (state.id) {
      try {
        await updateDecision(state.id, { narrative, current_step: 3 })
        const { idA, idB } = await upsertOptions(state.id, optionA.content, optionB.content)
        setOptionIds({ idA, idB })
      } catch (e) { console.error('Step02 save error:', e) }
    }
  }

  async function completeStep03(bodyLocation: string, emotionColor: EmotionColor, reflection: string) {
    update({ emotionBodyLocation: bodyLocation, emotionColor, emotionReflection: reflection, currentStep: 4 })
    if (state.id) {
      try {
        await updateDecision(state.id, { current_step: 4 })
        await saveEmotionMap(state.id, bodyLocation, emotionColor, reflection)
      } catch {
        // non-fatal
      }
    }
  }

  async function completeStep04(lens: Lens) {
    update({ lens, currentStep: 5 })
    if (state.id) {
      try {
        await updateDecision(state.id, { lens, current_step: 5 })
      } catch {}
    }
  }

  async function completeStep05(tags: Record<string, string[]>) {
    if (state.id) {
      try {
        if (optionIds.idA) {
          const tagsA = [
            ...(tags.A_pro ?? []).map(l => ({ label: l, tagType: 'pro' })),
            ...(tags.A_con ?? []).map(l => ({ label: l, tagType: 'con' })),
            ...(tags.A_desire ?? []).map(l => ({ label: l, tagType: 'desire' })),
            ...(tags.A_fear ?? []).map(l => ({ label: l, tagType: 'fear' })),
          ]
          if (tagsA.length) await saveOptionTags(optionIds.idA, tagsA)
        }
        if (optionIds.idB) {
          const tagsB = [
            ...(tags.B_pro ?? []).map(l => ({ label: l, tagType: 'pro' })),
            ...(tags.B_con ?? []).map(l => ({ label: l, tagType: 'con' })),
            ...(tags.B_desire ?? []).map(l => ({ label: l, tagType: 'desire' })),
            ...(tags.B_fear ?? []).map(l => ({ label: l, tagType: 'fear' })),
          ]
          if (tagsB.length) await saveOptionTags(optionIds.idB, tagsB)
        }
      } catch (e) { console.error('Step05 save error:', e) }
    }
    setSessionData(prev => ({
      ...prev,
      tags05: {
        pro: tags.A_pro ?? [], con: tags.A_con ?? [], desire: tags.A_desire ?? [], fear: tags.A_fear ?? [],
        B_pro: tags.B_pro ?? [], B_con: tags.B_con ?? [], B_desire: tags.B_desire ?? [], B_fear: tags.B_fear ?? [],
      },
    }))
    const summaryType: SummaryType = (state.lens ?? 'pros_cons') === 'pros_cons' ? 'pros_cons' : 'fears_desires'
    setPendingSummary({
      type: summaryType,
      tagsA: { pro: tags.A_pro ?? [], con: tags.A_con ?? [], desire: tags.A_desire ?? [], fear: tags.A_fear ?? [] },
      tagsB: { pro: tags.B_pro ?? [], con: tags.B_con ?? [], desire: tags.B_desire ?? [], fear: tags.B_fear ?? [] },
      onConfirm: () => {
        setPendingSummary(null)
        update({ currentStep: 6 })
        if (state.id) updateDecision(state.id, { current_step: 6 }).catch(() => {})
      },
    })
  }

  async function completeStep06(valuesA: string[], needsA: string[], valuesB: string[], needsB: string[]) {
    if (state.id) {
      try {
        if (optionIds.idA) {
          await saveOptionTags(optionIds.idA, [
            ...valuesA.map(l => ({ label: l, tagType: 'value' })),
            ...needsA.map(l => ({ label: l, tagType: 'need' })),
          ])
        }
        if (optionIds.idB) {
          await saveOptionTags(optionIds.idB, [
            ...valuesB.map(l => ({ label: l, tagType: 'value' })),
            ...needsB.map(l => ({ label: l, tagType: 'need' })),
          ])
        }
      } catch {}
    }
    setSessionData(prev => ({ ...prev, valuesA, needsA, valuesB, needsB }))
    setPendingSummary({
      type: 'values_needs',
      tagsA: { values: valuesA, needs: needsA },
      tagsB: { values: valuesB, needs: needsB },
      onConfirm: () => {
        setPendingSummary(null)
        update({ currentStep: 7 })
        if (state.id) updateDecision(state.id, { current_step: 7 }).catch(() => {})
      },
    })
  }

  async function completeStep07(projectionsA: string[], projectionsB: string[], chosenLean?: string, reflectionNote?: string) {
    if (state.id) {
      try {
        await updateDecision(state.id, { status: 'completed', current_step: 7 })
        if (optionIds.idA) await saveProjections(optionIds.idA, projectionsA, projectionsA.map(() => true))
        if (optionIds.idB) await saveProjections(optionIds.idB, projectionsB, projectionsB.map(() => false))
        const leanLabel = chosenLean === 'A' || chosenLean === 'B' ? chosenLean : null
        const chosenOptionId = leanLabel === 'A' ? optionIds.idA : leanLabel === 'B' ? optionIds.idB : undefined
        const parts: string[] = []
        if (leanLabel) parts.push(`Leaning towards Option ${leanLabel}`)
        else if (chosenLean === 'undecided') parts.push('Still undecided')
        if (reflectionNote) parts.push(reflectionNote)
        if (parts.length || chosenOptionId) {
          await addOutcome({ decisionId: state.id, reflection: `[Reflection] ${parts.join('\n')}`, chosenOptionId })
        }
      } catch (e) { console.error('Step07 save error:', e) }
    }
    setSessionData(prev => ({ ...prev, projectionsA, projectionsB, chosenLean, reflectionNote }))
    // Start the post-flow: projections section summary → session summary → insight → clarity → commitment
    setPendingSummary({
      type: 'projections',
      tagsA: { projections: projectionsA },
      tagsB: { projections: projectionsB },
      onConfirm: () => {
        setPendingSummary(null)
        setPostFlow('session_summary')
      },
    })
  }

  function finishFlow(commitment: string) {
    setCelebrating(true)
    setCompletedSummary({
      title: state.title,
      optionA: state.optionA?.content,
      optionB: state.optionB?.content,
      chosenLean: sessionData.chosenLean,
      reflectionNote: sessionData.reflectionNote,
      commitment,
      decisionId: state.id,
    })
    setPostFlow(null)
  }

  if (pendingSummary && state.optionA && state.optionB) {
    return (
      <SectionSummaryScreen
        decisionTitle={state.title}
        stepType={pendingSummary.type}
        optionA={state.optionA}
        optionB={state.optionB}
        tagsA={pendingSummary.tagsA}
        tagsB={pendingSummary.tagsB}
        decisionId={state.id}
        onContinue={pendingSummary.onConfirm}
        onBack={() => setPendingSummary(null)}
      />
    )
  }

  if (!state.optionA || !state.optionB) {
    // Steps 4+ require options — fall back to step 2 to re-enter them
    if (state.currentStep >= 4) {
      return (
        <Step02
          decisionTitle={state.title}
          decisionId={state.id}
          initialNarrative={state.narrative}
          onComplete={completeStep02}
          onBack={goBack}
          onSkip={skip}
        />
      )
    }
    if (state.currentStep === 1) {
      return <Step01 initialTitle={state.title} initialSubtitle={state.subtitle} onComplete={completeStep01} onBack={goBack} />
    }
    if (state.currentStep === 2) {
      return (
        <Step02
          decisionTitle={state.title}
          decisionId={state.id}
          initialNarrative={state.narrative}
          initialOptionA={state.optionA}
          initialOptionB={state.optionB}
          onComplete={completeStep02}
          onBack={goBack}
          onSkip={skip}
        />
      )
    }
    if (state.currentStep === 3) {
      return (
        <Step03
          decisionTitle={state.title}
          decisionId={state.id}
          narrative={state.narrative}
          initialBodyLocation={state.emotionBodyLocation}
          initialEmotion={state.emotionColor}
          initialReflection={state.emotionReflection}
          onComplete={completeStep03}
          onBack={goBack}
          onSkip={skip}
        />
      )
    }
  }

  switch (state.currentStep) {
    case 1: return (
      <Step01
        initialTitle={state.title}
        initialSubtitle={state.subtitle}
        onComplete={completeStep01}
        onBack={goBack}
      />
    )
    case 2: return (
      <Step02
        decisionTitle={state.title}
        decisionId={state.id}
        initialNarrative={state.narrative}
        initialOptionA={state.optionA}
        initialOptionB={state.optionB}
        onComplete={completeStep02}
        onBack={goBack}
        onSkip={skip}
      />
    )
    case 3: return (
      <Step03
        decisionTitle={state.title}
        decisionId={state.id}
        narrative={state.narrative}
        initialBodyLocation={state.emotionBodyLocation}
        initialEmotion={state.emotionColor}
        initialReflection={state.emotionReflection}
        onComplete={completeStep03}
        onBack={goBack}
        onSkip={skip}
      />
    )
    case 4: return (
      <Step04
        decisionTitle={state.title}
        optionA={state.optionA!}
        optionB={state.optionB!}
        initialLens={state.lens}
        onComplete={completeStep04}
        onBack={goBack}
        onSkip={skip}
      />
    )
    case 5: return (
      <Step05
        decisionTitle={state.title}
        decisionId={state.id}
        narrative={state.narrative}
        optionA={state.optionA!}
        optionB={state.optionB!}
        lens={state.lens ?? 'pros_cons'}
        initialTagsA={sessionData.tags05 ? {
          pro: sessionData.tags05.pro ?? [],
          con: sessionData.tags05.con ?? [],
          desire: sessionData.tags05.desire ?? [],
          fear: sessionData.tags05.fear ?? [],
        } : undefined}
        initialTagsB={sessionData.tags05 ? {
          pro: sessionData.tags05.B_pro ?? [],
          con: sessionData.tags05.B_con ?? [],
          desire: sessionData.tags05.B_desire ?? [],
          fear: sessionData.tags05.B_fear ?? [],
        } : undefined}
        onComplete={completeStep05}
        onBack={goBack}
        onSkip={skip}
      />
    )
    case 6: return (
      <Step06
        decisionTitle={state.title}
        decisionId={state.id}
        optionA={state.optionA!}
        optionB={state.optionB!}
        initialValuesA={sessionData.valuesA}
        initialNeedsA={sessionData.needsA}
        initialValuesB={sessionData.valuesB}
        initialNeedsB={sessionData.needsB}
        onComplete={completeStep06}
        onBack={goBack}
        onSkip={skip}
      />
    )
    case 7: return (
      <Step07
        decisionTitle={state.title}
        decisionId={state.id}
        optionA={state.optionA!}
        optionB={state.optionB!}
        initialSelectedA={sessionData.projectionsA}
        initialSelectedB={sessionData.projectionsB}
        initialChosenLean={sessionData.chosenLean}
        initialReflectionNote={sessionData.reflectionNote}
        onComplete={completeStep07}
        onBack={goBack}
        onSkip={skip}
      />
    )
    default: return (
      <Step01 initialTitle={state.title} initialSubtitle={state.subtitle} onComplete={completeStep01} onBack={goBack} />
    )
  }
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
