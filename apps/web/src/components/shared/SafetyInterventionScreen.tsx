'use client'
import { useRouter } from 'next/navigation'

/**
 * Renders instead of the room's normal step flow when a
 * `RoomCommandResponse.safetyIntervention` comes back non-null (spec §30,
 * docs/SAFETY_SYSTEM_DESIGN.md Stage 2, ADR 0012). Deliberately the
 * opposite shape of the existing soft-stopping-cue modal
 * (StepShell.tsx/MirrorStepShell.tsx): that one offers "Keep going" because
 * ordinary pacing fatigue is fine to continue past if the person chooses.
 * This one offers ONLY a way out — no "keep going," no room navigation, no
 * skip — because spec §30 is explicit that ordinary deep-work routing must
 * stay suspended until safety is addressed, not resumed on request.
 *
 * `message` is the real, model-generated response from
 * `safety/respond_concern`/`respond_danger` (lib/safety.ts) — this
 * component renders it verbatim, it doesn't author any crisis-support
 * copy itself.
 */
export default function SafetyInterventionScreen({
  message,
}: {
  message: string
  safetyState: 'safety_concern' | 'immediate_danger'
}) {
  const router = useRouter()

  return (
    <div className="relative min-h-screen max-w-[393px] mx-auto flex flex-col items-center justify-center px-6 text-center space-y-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0826] via-[#0d0818] to-[#0a0a0f] -z-10" />
      <p className="text-white/90 text-base leading-relaxed">{message}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="w-full py-3 rounded-2xl bg-[var(--color-violet-600)] hover:bg-[var(--color-violet-500)] text-white text-sm font-medium transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  )
}
