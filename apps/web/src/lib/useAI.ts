'use client'
import { useState } from 'react'

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenCapReached, setTokenCapReached] = useState(false)

  async function callAI<T>(type: string, params: Record<string, unknown>, decisionId?: string): Promise<T | null> {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, decisionId, ...params }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 402) {
          setTokenCapReached(true)
          setError('token_cap_reached')
        } else {
          setError(json.error ?? 'AI call failed')
        }
        return null
      }
      return json.result as T
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }

  function dismissTokenCap() {
    setTokenCapReached(false)
  }

  return { callAI, loading, error, tokenCapReached, dismissTokenCap }
}
