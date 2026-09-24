'use client'
import { useEffect, useState } from 'react'
import { getPreferences } from '@/lib/api/v1-client'

// Shared by every place that shows the profile photo (Sidebar, MobileHeader,
// MobileNav, TopBar) — they used to fetch preferences independently on each
// mount. The URL is a presigned S3 link that expires, so the cache is short
// (MAX_AGE_MS) rather than for the whole page lifetime; `setAvatarUrlEverywhere`
// pushes a freshly uploaded photo to all of them at once.
const MAX_AGE_MS = 10 * 60 * 1000

let cached: { url: string | null; at: number } | null = null
let inflight: Promise<string | null> | null = null
const listeners = new Set<(url: string | null) => void>()

function loadAvatarUrl(): Promise<string | null> {
  if (cached && Date.now() - cached.at < MAX_AGE_MS) return Promise.resolve(cached.url)
  if (!inflight) {
    inflight = getPreferences()
      .then((p) => {
        cached = { url: p.avatarUrl, at: Date.now() }
        return p.avatarUrl
      })
      .catch(() => null) // not cached — a later mount retries
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Call after the person uploads or removes their photo, so every avatar updates without a reload. */
export function setAvatarUrlEverywhere(url: string | null): void {
  cached = { url, at: Date.now() }
  listeners.forEach((l) => l(url))
}

/** The signed-in person's profile photo URL, or null (none set, not loaded yet, or signed out). */
export function useAvatarUrl(): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => cached?.url ?? null)
  useEffect(() => {
    let active = true
    listeners.add(setAvatarUrl)
    loadAvatarUrl().then((url) => {
      if (active) setAvatarUrl(url)
    })
    return () => {
      active = false
      listeners.delete(setAvatarUrl)
    }
  }, [])
  return avatarUrl
}
