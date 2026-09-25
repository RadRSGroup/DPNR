import { signOut } from '@/lib/cognito/client'
import { revokeCurrentSessionTicket } from './keyBootstrap'
import { closeFocusPlayer } from '@/lib/focus-player'

/**
 * The one log-out path (Session 68): revoke this tab's session ticket
 * (best-effort, see keyBootstrap.ts), then sign out of Cognito. Callers
 * navigate to /login afterwards. Was duplicated inline in TopBar and the
 * Account page.
 */
export async function logOut(): Promise<void> {
  closeFocusPlayer() // the player lives in the root layout, which a sign-out doesn't unmount
  await revokeCurrentSessionTicket().catch(() => {})
  signOut()
}
