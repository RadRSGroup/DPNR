// The last known credits balance, shared by every screen that shows it.
// No imports on purpose: v1-client.ts writes here (every GET /v1/credits
// publishes its balance; every call that can charge or grant credits marks it
// stale), and useCreditsBalance.ts reads it, without an import cycle.

/** How long a balance is reused before a newly mounted Sidebar fetches again. */
export const CREDITS_MAX_AGE_MS = 60 * 1000

let cached: { balance: number; at: number } | null = null
let stale = false
const balanceListeners = new Set<(balance: number) => void>()
const staleListeners = new Set<() => void>()

export function cachedCreditsBalance(): number | null {
  return cached?.balance ?? null
}

/** True when there is no balance yet, it is older than CREDITS_MAX_AGE_MS, or a charging call ran since. */
export function creditsBalanceNeedsRefresh(): boolean {
  return !cached || stale || Date.now() - cached.at >= CREDITS_MAX_AGE_MS
}

export function publishCreditsBalance(balance: number): void {
  cached = { balance, at: Date.now() }
  stale = false
  balanceListeners.forEach((l) => l(balance))
}

/** Call after any request that can change the balance (it may have failed, so don't guess the new value). */
export function markCreditsStale(): void {
  stale = true
  staleListeners.forEach((l) => l())
}

/** On sign-out: the next person in this tab must not see this balance. */
export function clearCreditsBalance(): void {
  cached = null
  stale = false
}

export function subscribeCreditsBalance(onBalance: (balance: number) => void, onStale: () => void): () => void {
  balanceListeners.add(onBalance)
  staleListeners.add(onStale)
  return () => {
    balanceListeners.delete(onBalance)
    staleListeners.delete(onStale)
  }
}
