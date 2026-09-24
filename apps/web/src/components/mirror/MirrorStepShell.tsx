'use client'
import RoomStepLayout from '@/components/shared/RoomStepLayout'

const TOTAL_STEPS = 6

interface MirrorStepShellProps {
  step: number
  sessionTitle: string
  children: React.ReactNode
  onBack?: () => void
  /** Starting time budget in minutes — now the seed for a real countdown. */
  minutesLeft?: number
}

/**
 * Mirror Room's step chrome. Since Session 68 both rooms render through
 * components/shared/RoomStepLayout.tsx (the 393px phone frame they each
 * copied made the rooms mobile-only on desktop). Same visual
 * system (galaxy gradient, progress dots, quoted title, "a word from us"
 * reflection line) with Mirror Room's own 6-step labels/copy. No `onSkip`
 * prop — no Mirror Room step has a SKIP action (see mirror-steps/*.ts's
 * `allowedActions`), so there's nothing to bind a Skip button to.
 */
const STEP_LABELS: Record<number, string> = {
  1: 'The Situation',
  2: 'In the Moment',
  3: 'The Pattern',
  4: 'The Impact',
  5: 'Synthesis',
  6: 'Commitment',
}

const STEP_INFO: Record<number, string> = {
  1: 'Naming exactly what happened — without judgment — is the first step to seeing it clearly.',
  2: 'Your thought, feeling, body sensation, and reaction usually arrive together, faster than you can think. Slowing down to name each one separately is where insight starts.',
  3: 'How you coped afterward, and whether this keeps happening with the same people or situations, is often more revealing than the incident itself.',
  4: 'Every reaction ripples outward — into your energy, your mood, and the parts of your life it actually touches.',
  5: 'Seeing the whole arc reflected back can surface a thread you didn\'t consciously connect yourself.',
  6: 'A commitment only has to be small enough to actually happen.',
}

const STEP_REFLECTIONS: Record<number, string> = {
  1: 'What you name clearly, you can finally look at.',
  2: 'Your body often knows before your mind finds the words.',
  3: 'Patterns repeat until they\'re seen.',
  4: 'Nothing that affects you is really "just in your head."',
  5: 'Reflection is how experience becomes understanding.',
  6: 'A small, honest step is worth more than a perfect plan.',
}

export default function MirrorStepShell({
  step,
  sessionTitle,
  children,
  onBack,
  minutesLeft = 12,
}: MirrorStepShellProps) {
  return (
    <RoomStepLayout
      roomLabel="Mirror Room"
      backgroundSrc="/images/backgrounds/mirror-bg.webp"
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabels={STEP_LABELS}
      stepInfo={STEP_INFO}
      stepReflections={STEP_REFLECTIONS}
      title={sessionTitle}
      onBack={onBack}
      minutesLeft={minutesLeft}
    >
      {children}
    </RoomStepLayout>
  )
}
