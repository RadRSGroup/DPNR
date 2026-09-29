import type { PostConfirmationTriggerEvent } from 'aws-lambda'
import { ensureProfile } from './ensure-profile'

/**
 * Cognito post-confirmation trigger. Creates the app-level PROFILE item —
 * migration plan §10 Phase 2 / §11 workstream 1. Does NOT create the KEYS
 * item: crypto material is generated client-side and pushed via a
 * separate, explicit API call (the client never sends key inputs through
 * a Cognito trigger). Consent starts unset; the consent gate (proxy.ts
 * equivalent + the pre-token-generation trigger's claim) enforces
 * collecting it before any personal-content processing happens.
 *
 * Also grants the Beta Trial starter credit balance (§5.6) — but only on
 * the confirmation that actually creates the profile, not on a Cognito
 * retry of this same trigger, which would otherwise double-grant.
 */
export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event
  }
  await ensureProfile(event.request.userAttributes.sub)
  return event
}
