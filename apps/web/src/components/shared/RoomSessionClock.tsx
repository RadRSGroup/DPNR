'use client'
import { createContext, useContext, useEffect, useState } from 'react'

/**
 * One clock per room visit, shared by every step screen.
 *
 * The countdown and the 80% soft stopping cue used to live in
 * RoomStepLayout's own state. Each step is its own component, so the layout
 * remounted on every step change: the timer restarted at the full budget on
 * each step and the cue could essentially never fire over a normal session
 * (found in Session 69 part 4). The room page now provides this once
 * (decision/new, mirror/new), so the clock survives step changes and the
 * non-step screens in between.
 *
 * It measures this visit, not the session's lifetime: resuming a session
 * later starts a fresh clock, since the cue is about one sustained sitting.
 */
interface RoomSessionClock {
  startedAt: number
  stoppingCueDismissed: boolean
  dismissStoppingCue: () => void
}

const RoomSessionClockContext = createContext<RoomSessionClock | null>(null)

export function RoomSessionClockProvider({ children }: { children: React.ReactNode }) {
  const [startedAt] = useState(() => Date.now())
  const [stoppingCueDismissed, setStoppingCueDismissed] = useState(false)
  return (
    <RoomSessionClockContext.Provider
      value={{ startedAt, stoppingCueDismissed, dismissStoppingCue: () => setStoppingCueDismissed(true) }}
    >
      {children}
    </RoomSessionClockContext.Provider>
  )
}

/**
 * Seconds elapsed on the room's clock, ticking once a second, plus the
 * stopping-cue dismissal. Without a provider (a step rendered on its own)
 * it falls back to a clock that starts at this component's mount, which was
 * the old behavior.
 */
export function useRoomSessionClock() {
  const shared = useContext(RoomSessionClockContext)
  const [localStartedAt] = useState(() => Date.now())
  const [localDismissed, setLocalDismissed] = useState(false)
  const startedAt = shared?.startedAt ?? localStartedAt
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  return {
    elapsedSeconds: Math.max(0, Math.floor((now - startedAt) / 1000)),
    stoppingCueDismissed: shared?.stoppingCueDismissed ?? localDismissed,
    dismissStoppingCue: shared?.dismissStoppingCue ?? (() => setLocalDismissed(true)),
  }
}
