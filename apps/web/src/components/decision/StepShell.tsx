'use client'
import RoomStepLayout from '@/components/shared/RoomStepLayout'
import { useTranslations } from 'next-intl'

/**
 * The six user-facing phases (founder feedback 2026-09-28 #11 and flag E:
 * keep the established 6 UX phases, don't show a count that conflicts with
 * it). They're the landing's Decision Journey, in its order. The ten
 * screens map onto them; the counter shows the phase, and the screen keeps
 * its own name beside it ("Step 5 of 6 · Future Projection"). Before this
 * the counter said "of 7" and the summary screens showed "Step 8 of 7".
 * Labels live in messages (DecisionRoom.phases).
 */
const PHASES = [1, 2, 3, 4, 5, 6]
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
// Copy per screen: DecisionRoom.stepInfo / stepReflections / stepLabels.

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
  const t = useTranslations('DecisionRoom')
  const phase = PHASE_OF_SCREEN[step] ?? 1
  const phaseLabels = Object.fromEntries(PHASES.map((p) => [p, t(`phases.${p}`)]))
  return (
    <RoomStepLayout
      roomLabel={t('roomLabel')}
      // The room's own forest (the landing hero's glowing trees), dimmed so
      // it stays atmosphere, never competing with the text (2026-09-28 #22).
      backgroundSrc="/images/decision/decision-room-hero.webp"
      dimBackground
      step={phase}
      totalSteps={6}
      stepLabels={phaseLabels}
      stepInfo={{ [phase]: t(`stepInfo.${step}`) }}
      stepReflections={{ [phase]: t(`stepReflections.${step}`) }}
      screenLabel={t(`stepLabels.${step}`)}
      title={decisionTitle}
      onBack={onBack}
      onSkip={onSkip}
      minutesLeft={minutesLeft}
    >
      {children}
    </RoomStepLayout>
  )
}
