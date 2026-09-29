/**
 * What counts as one "visit" to DPNR, in this browser.
 *
 * Founder feedback (2026-09-27 #5, reaffirmed by the user 2026-09-29): every
 * visit starts in Main Chat, even when the sign-in token is still valid,
 * and Main Chat opens each visit with a fresh conversation. A visit ends
 * after VISIT_GAP_MS without DPNR open and visible; any tab of DPNR that's
 * visible keeps it going (VisitGate refreshes `lastSeen`). Kept in
 * localStorage so all tabs share one visit: a second tab opened mid-visit
 * isn't a new one, and a restored tab the next morning is.
 *
 * Best effort: if storage is blocked, every load counts as the same visit
 * (nothing redirects, Main Chat resumes), rather than yanking the person
 * back to Main Chat on every page.
 */
export const VISIT_GAP_MS = 30 * 60_000

const VISIT_KEY = 'dpnr.visit'
const MAIN_CHAT_KEY = 'dpnr.visitMainChat'

interface VisitRecord {
  id: string
  lastSeen: number
}

function read(): VisitRecord | null {
  const raw = localStorage.getItem(VISIT_KEY)
  if (!raw) return null
  const v = JSON.parse(raw) as Partial<VisitRecord>
  return typeof v.id === 'string' && typeof v.lastSeen === 'number' ? { id: v.id, lastSeen: v.lastSeen } : null
}

/**
 * The current visit, starting a new one if the last was too long ago.
 * Also marks the visit as seen now. `isNew` is true only for the call that
 * started it.
 */
export function touchVisit(now = Date.now()): { id: string; isNew: boolean } {
  try {
    const current = read()
    if (current && now - current.lastSeen < VISIT_GAP_MS) {
      localStorage.setItem(VISIT_KEY, JSON.stringify({ id: current.id, lastSeen: now }))
      return { id: current.id, isNew: false }
    }
    const id = String(now)
    localStorage.setItem(VISIT_KEY, JSON.stringify({ id, lastSeen: now }))
    return { id, isNew: true }
  } catch {
    return { id: 'unknown', isNew: false }
  }
}

/**
 * True the first time Main Chat opens in the current visit (that load
 * starts a fresh conversation); false after that, so coming back to Main
 * Chat later in the same visit resumes the open thread.
 */
export function claimFreshMainChat(): boolean {
  try {
    const { id } = touchVisit()
    if (id === 'unknown' || localStorage.getItem(MAIN_CHAT_KEY) === id) return false
    localStorage.setItem(MAIN_CHAT_KEY, id)
    return true
  } catch {
    return false
  }
}
