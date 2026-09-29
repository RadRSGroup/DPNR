'use client'
import { useState } from 'react'

/** Bound to one step's REFINE call (page.tsx) — returns the command's `result`, or null on failure. */
export type RefineFn = (params: Record<string, unknown>) => Promise<Record<string, unknown> | null>

/**
 * Public shape (`callAI`/`loading`/`error`/`tokenCapReached`/`dismissTokenCap`) is unchanged from the
 * Supabase-era version so every step component's JSX keeps compiling — only the transport changes: this
 * now calls the step's own REFINE command (via `onRefine`, bound in page.tsx to `submitRoomCommand`)
 * instead of the old `/api/ai` route. `tokenCapReached` stays permanently false — the old per-user
 * token-budget gate (402 `token_cap_reached`) has no `/v1` equivalent yet (Credits is unbuilt).
 */
/**
 * Identical calls already in flight (same type + params). A screen that mounts
 * twice, or two effects asking for the same suggestions, share one REFINE
 * instead of sending (and paying for) it twice.
 */
const inFlight = new Map<string, Promise<Record<string, unknown> | null>>()

export function useAI(onRefine: RefineFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function callAI<T>(_type: string, params: Record<string, unknown>): Promise<T | null> {
    setLoading(true)
    setError(null)
    try {
      const key = `${_type}:${JSON.stringify(params)}`
      let pending = inFlight.get(key)
      if (!pending) {
        pending = onRefine(params).finally(() => inFlight.delete(key))
        inFlight.set(key, pending)
      }
      const res = await pending
      if (res === null) {
        setError('AI call failed')
        return null
      }
      return res as T
    } finally {
      setLoading(false)
    }
  }

  return {
    callAI,
    loading,
    error,
    tokenCapReached: false,
    dismissTokenCap: () => {},
  }
}
