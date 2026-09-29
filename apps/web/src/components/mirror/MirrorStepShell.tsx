'use client'
import { useTranslations } from 'next-intl'
import RoomStepLayout from '@/components/shared/RoomStepLayout'

const TOTAL_STEPS = 6

interface MirrorStepShellProps {
  step: number
  sessionTitle: string
  children: React.ReactNode
  onBack?: () => void
  /** Starting time budget in minutes — now the seed for a real countdown. */
  minutesLeft?: number
  /** Names an in-between screen (a depth moment, the pause) next to the step count. */
  screenLabel?: string
}

/**
 * Mirror Room's step chrome. Since Session 68 both rooms render through
 * components/shared/RoomStepLayout.tsx (the 393px phone frame they each
 * copied made the rooms mobile-only on desktop). Same visual
 * system (galaxy gradient, progress dots, quoted title, "a word from us"
 * reflection line) with Mirror Room's own 6-step labels/copy. No `onSkip`
 * prop — no Mirror Room step has a SKIP action (see mirror-steps/*.ts's
 * `allowedActions`), so there's nothing to bind a Skip button to.
 * The step labels, info and reflections are `MirrorRoom.steps.*`.
 */
const STEPS = [1, 2, 3, 4, 5, 6] as const

export default function MirrorStepShell({
  step,
  sessionTitle,
  children,
  onBack,
  minutesLeft = 12,
  screenLabel,
}: MirrorStepShellProps) {
  const t = useTranslations('MirrorRoom')
  const byStep = (group: 'labels' | 'info' | 'reflections') =>
    Object.fromEntries(STEPS.map((n) => [n, t(`steps.${group}.${n}`)])) as Record<number, string>

  return (
    <RoomStepLayout
      roomLabel={t('title')}
      backgroundSrc="/images/backgrounds/mirror-bg.webp"
      step={step}
      totalSteps={TOTAL_STEPS}
      stepLabels={byStep('labels')}
      stepInfo={byStep('info')}
      stepReflections={byStep('reflections')}
      title={sessionTitle}
      onBack={onBack}
      minutesLeft={minutesLeft}
      screenLabel={screenLabel}
    >
      {children}
    </RoomStepLayout>
  )
}
