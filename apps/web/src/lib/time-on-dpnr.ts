'use client'
import { useSyncExternalStore } from 'react'

/**
 * "Time on DPNR" (Session 70, feedback log): a calm awareness count, not a
 * countdown or an engagement metric — no goals, streaks or "too long" nudges.
 *
 * Option A, chosen for the smallest change (no backend): counted in this
 * browser only, per local calendar day, in localStorage. Not synced across
 * devices, and cleared with site data.
 *
 * - Active: the page is visible and the person interacted (pointer, keys,
 *   scroll, typing) within the last ACTIVE_WINDOW_MS.
 * - Ambient: not active, but the page is visible or DPNR music is open.
 *   (Spotify's embed doesn't tell us whether it's actually playing, so an
 *   open player counts as music.)
 * - Neither (tab hidden, no music): not counted.
 */
export const TICK_MS = 5000
export const ACTIVE_WINDOW_MS = 60_000
const STORAGE_KEY = 'dpnr.timeOnDpnr'

export interface TimeToday {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  activeSeconds: number
  ambientSeconds: number
}

export function localDay(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function read(): TimeToday {
  const today = localDay()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<TimeToday>
      if (v.date === today && typeof v.activeSeconds === 'number' && typeof v.ambientSeconds === 'number') {
        return { date: today, activeSeconds: v.activeSeconds, ambientSeconds: v.ambientSeconds }
      }
    }
  } catch {
    // storage blocked or corrupt — start the day at zero
  }
  return { date: today, activeSeconds: 0, ambientSeconds: 0 }
}

let cached: TimeToday | null = null
const listeners = new Set<() => void>()

/** Adds one tick to today's count (a new day starts from zero). */
export function addTime(kind: 'active' | 'ambient', seconds: number) {
  const current = read()
  const next: TimeToday =
    kind === 'active'
      ? { ...current, activeSeconds: current.activeSeconds + seconds }
      : { ...current, ambientSeconds: current.ambientSeconds + seconds }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // not remembered past this page; still shown
  }
  cached = next
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cached = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot(): TimeToday {
  if (!cached || cached.date !== localDay()) cached = read()
  return cached
}

/** Today's counts, or null on the server / before hydration. */
export function useTimeToday(): TimeToday | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

/** Which bucket the current tick belongs to, or null if it isn't counted. */
export function classifyTick(visible: boolean, msSinceInteraction: number, musicOpen: boolean): 'active' | 'ambient' | null {
  if (visible && msSinceInteraction <= ACTIVE_WINDOW_MS) return 'active'
  if (visible || musicOpen) return 'ambient'
  return null
}
