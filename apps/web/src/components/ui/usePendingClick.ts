'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Press feedback for buttons whose action is slow (a room step saving, user
 * report 2026-09-29: "it's slow to continue"). If `onClick` returns a
 * promise, the button is pending until it settles: callers show a spinner
 * and ignore repeat taps, so a slow save can't be sent twice. Sync handlers
 * are unaffected.
 */
export function usePendingClick(onClick?: () => unknown) {
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])

  function handleClick() {
    if (busy.current || !onClick) return
    const result = onClick()
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      busy.current = true
      setPending(true)
      Promise.resolve(result).finally(() => {
        busy.current = false
        if (mounted.current) setPending(false)
      })
    }
  }

  return { pending, handleClick }
}

/** The shared spinner (animate-spin is allowed by check-motion: status, not decoration). */
export const SPINNER_PATH = 'M4 12a8 8 0 018-8v8z'
