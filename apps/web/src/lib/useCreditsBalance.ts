'use client'
import { useEffect, useState } from 'react'
import { getCredits } from '@/lib/api/v1-client'
import { cachedCreditsBalance, creditsBalanceNeedsRefresh, subscribeCreditsBalance } from '@/lib/credits-balance'

// The Sidebar renders on every in-app screen, and the room pages render it in
// several branches, so it remounts on every room step. It used to fetch
// GET /v1/credits on each mount; now mounts reuse the shared balance and only
// fetch when it is missing, older than a minute, or a charging call ran.

let inflight: Promise<void> | null = null

function refresh(): void {
  if (inflight) return
  // getCredits publishes the balance to credits-balance.ts itself.
  inflight = getCredits()
    .then(() => {})
    .catch(() => {
      // Sidebar renders on pages with no session yet (e.g. mid-redirect): a
      // failed fetch just leaves the generic label, and a later mount retries.
    })
    .finally(() => {
      inflight = null
    })
}

/** The signed-in person's credits balance, or null (not loaded yet, or signed out). */
export function useCreditsBalance(): number | null {
  const [balance, setBalance] = useState<number | null>(() => cachedCreditsBalance())
  useEffect(() => {
    // A fresh closure per mount: the listener sets dedupe by identity, so a
    // shared `refresh` would be dropped for everyone when one mount unsubscribes.
    const unsubscribe = subscribeCreditsBalance((b) => setBalance(b), () => refresh())
    if (creditsBalanceNeedsRefresh()) refresh()
    return unsubscribe
  }, [])
  return balance
}
