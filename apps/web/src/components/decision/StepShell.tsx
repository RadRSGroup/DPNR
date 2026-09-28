'use client'
import RoomStepLayout from '@/components/shared/RoomStepLayout'
import { STEP_LABELS } from '@/lib/types'

/**
 * The six user-facing phases (founder feedback 2026-09-28 #11 and flag E:
 * keep the established 6 UX phases, don't show a count that conflicts with
 * it). They're the landing's Decision Journey, in its order. The ten
 * screens map onto them; the counter shows the phase, and the screen keeps
 * its own name beside it ("Step 5 of 6 · Future Projection"). Before this
 * the counter said "of 7" and the summary screens showed "Step 8 of 7".
 */
const PHASE_LABELS: Record<number, string> = { 1: 'Define', 2: 'Explore', 3: 'Feel', 4: 'Align', 5: 'Decide', 6: 'Act' }
const PHASE_OF_SCREEN: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6, 10: 6 }

interface StepShellProps {
  step: number
  decisionTitle: string
  children: React.ReactNode
  onBack?: () => void
  onSkip?: () => void
  /** Starting time budget in minutes — was a static display value with no
   * countdown at all (docs/PHASE_AUDIT.md's own "real gap, newly found").
   * Now the seed for a real client-side countdown; 25 matches
   * DecisionRoomLanding's own "Takes about 25 minutes" copy. */
  minutesLeft?: number
}

// The soft stopping cue (spec §6, 80% of the time budget) lives in
// components/shared/RoomStepLayout.tsx.

// The "?" info button used to call an AI `step_info` prompt (apps/web-only,
// pre-/v1 port). No step in the 14-step command contract implements an
// equivalent action — it was an orphaned Prompt Registry entry with nothing
// in decision-steps/*.ts ever resolving it. Rather than call a dead route,
// this is now static copy per step; revisit if a real backend equivalent
// ever exists.
const STEP_INFO: Record<number, string> = {
  1: 'Naming your decision clearly is the first step toward making it with intention rather than reacting to it.',
  2: 'Writing out both real options, even roughly, turns a foggy dilemma into something you can actually compare.',
  3: 'Emotions often show up in the body before the mind can name them. Noticing where helps you trust what you\'re feeling.',
  4: 'Different lenses surface different truths. Pick the one that matches what feels most alive in this decision right now.',
  5: 'Sit with each option honestly. The goal isn\'t to talk yourself into one, it\'s to see both clearly.',
  6: 'Values and needs are usually what a decision is really about, underneath the practical details.',
  7: 'Imagining a year ahead helps surface a gut sense of direction that pure logic sometimes misses.',
  8: 'This is a chance to see the whole shape of what you explored, before moving toward a next step.',
  9: 'An outside reflection of your own process can surface a thread you didn\'t consciously connect yourself.',
  10: 'A next step only has to be small enough to actually happen. Momentum matters more than size.',
}

const STEP_REFLECTIONS: Record<number, string> = {
  1: 'Naming what you\'re carrying is the first act of clarity.',
  2: 'Every decision holds two truths, and this step helps you see both.',
  3: 'Your body often knows what your mind is still working out.',
  4: 'The lens you choose shapes what becomes visible.',
  5: 'Looking closely at each path, without rushing, is wisdom.',
  6: 'What you value most is the compass behind every real choice.',
  7: 'Imagining forward helps you feel which path is truly yours.',
  8: 'Seeing the whole picture helps you understand what you truly know.',
  9: 'What you discovered here belongs to you. Carry it with care.',
  10: 'A small step taken with intention is worth more than a leap taken in fear.',
}

export default function StepShell({
  step,
  decisionTitle,
  children,
  onBack,
  onSkip,
  minutesLeft = 25,
}: StepShellProps) {
  // Layout (mobile column / desktop journey + side column) lives in
  // RoomStepLayout, shared with Mirror Room since Session 68.
  const phase = PHASE_OF_SCREEN[step] ?? 1
  return (
    <RoomStepLayout
      roomLabel="Decision Room"
      // The room's own forest (the landing hero's glowing trees), dimmed so
      // it stays atmosphere, never competing with the text (2026-09-28 #22).
      backgroundSrc="/images/decision/decision-room-hero.webp"
      dimBackground
      step={phase}
      totalSteps={6}
      stepLabels={PHASE_LABELS}
      stepInfo={{ [phase]: STEP_INFO[step] }}
      stepReflections={{ [phase]: STEP_REFLECTIONS[step] }}
      screenLabel={STEP_LABELS[step]}
      title={decisionTitle}
      onBack={onBack}
      onSkip={onSkip}
      minutesLeft={minutesLeft}
    >
      {children}
    </RoomStepLayout>
  )
}
