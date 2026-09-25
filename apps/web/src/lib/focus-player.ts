'use client'
import { useSyncExternalStore } from 'react'

/**
 * The DPNR music player's state, shared across the whole app (Session 70,
 * feedback log "DPNR Music / Global Player"). The Spotify embed itself lives
 * once in the root layout (`GlobalMusicPlayer`), so it keeps playing when the
 * person moves between pages; Focus Mode (Main Chat) and the floating bar
 * are just controls over this store.
 *
 * `dock` is where Focus Mode wants the player drawn (its card slot on Main
 * Chat): the player is positioned over that rect instead of floating, so
 * Main Chat looks as it did before. `null` = no dock on this page.
 *
 * Module state on purpose: it lives as long as the tab, which is exactly the
 * player's lifetime. Nothing is persisted; a reload stops the music (as any
 * page reload stops audio).
 */
export interface PlayerDock {
  top: number
  left: number
  width: number
  height: number
  /** Pixels hidden above/below by the dock's scroll container. */
  clipTop: number
  clipBottom: number
}

export interface FocusPlayerState {
  /** The open playlist (a FOCUS_PLAYLISTS id), or null when the player is closed. */
  moodId: string | null
  /** Floating bar only: Spotify's compact player shown (true) or just the bar (false). */
  expanded: boolean
  dock: PlayerDock | null
}

let state: FocusPlayerState = { moodId: null, expanded: true, dock: null }
const listeners = new Set<() => void>()
const SERVER_STATE: FocusPlayerState = { moodId: null, expanded: true, dock: null }

function set(next: Partial<FocusPlayerState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFocusPlayer(): FocusPlayerState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE)
}

/** Current state outside React (e.g. the time tracker's tick). */
export function getFocusPlayerState(): FocusPlayerState {
  return state
}

export function openFocusPlayer(moodId: string) {
  set({ moodId, expanded: true })
}

export function closeFocusPlayer() {
  set({ moodId: null })
}

export function setFocusPlayerExpanded(expanded: boolean) {
  set({ expanded })
}

export function setFocusPlayerDock(dock: PlayerDock | null) {
  const d = state.dock
  if (
    d === dock ||
    (d && dock && d.top === dock.top && d.left === dock.left && d.width === dock.width && d.height === dock.height && d.clipTop === dock.clipTop && d.clipBottom === dock.clipBottom)
  ) {
    return
  }
  set({ dock })
}
