'use client'
import { createContext, useContext } from 'react'

/**
 * Where a room step's close (✕) button goes. RoomStepLayout used to push
 * /dashboard unconditionally, so closing a deeper Mirror Room step left the
 * room entirely (founder feedback, 2026-09-27: it should return to the
 * room's own main screen). A room page that has a main screen of its own
 * provides it here; without a provider the button keeps going to Dashboard.
 */
const RoomExitContext = createContext<(() => void) | null>(null)

export function RoomExitProvider({ onExit, children }: { onExit: () => void; children: React.ReactNode }) {
  return <RoomExitContext.Provider value={onExit}>{children}</RoomExitContext.Provider>
}

export function useRoomExit() {
  return useContext(RoomExitContext)
}
