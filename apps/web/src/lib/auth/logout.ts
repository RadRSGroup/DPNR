import { signOut } from '@/lib/cognito/client'
import { revokeCurrentSessionTicket } from './keyBootstrap'
import { closeFocusPlayer } from '@/lib/focus-player'
import { clearCreditsBalance } from '@/lib/credits-balance'

/**
 * The one log-out path (Session 68): revoke this tab's session ticket
 * (best-effort, see keyBootstrap.ts), then sign out of Cognito. Callers
 * navigate to /login afterwards. Was duplicated inline in TopBar and the
 * Account page.
 */
export async function logOut(): Promise<void> {
  clearCreditsBalance() // the next person in this tab must not see this balance
  closeFocusPlayer() // the player lives in the root layout, which a sign-out doesn't unmount
  // The next sign-in in this tab is a new visit: Main Chat starts fresh.
  try {
    sessionStorage.removeItem('dpnr.mainChatVisit')
  } catch {
    // storage blocked: nothing was stored either
  }
  await revokeCurrentSessionTicket().catch(() => {})
  signOut()
}
