/**
 * Google sign-in through Cognito's OAuth endpoints (Session 83). The hosted
 * UI is skipped: `identity_provider=Google` sends the browser straight to
 * Google, and `/auth/callback` exchanges the code (authorization code +
 * PKCE; the web client has no secret) for Cognito tokens, which
 * `adoptOAuthSession` then stores exactly like an SRP sign-in.
 */
// Custom domain (Session 83): Google's consent screen must only show domains
// DPNR owns. The dpnr-auth prefix domain still works as a fallback via the env var.
const OAUTH_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN ?? 'auth.be-dpnr.com'
export const COGNITO_OAUTH_ORIGIN = `https://${OAUTH_DOMAIN}`
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!
const PENDING_KEY = 'dpnr_oauth_pending'
const RETRIED_KEY = 'dpnr_oauth_retried'

interface PendingSignIn {
  state: string
  verifier: string
  next: string
  locale: 'en' | 'he'
}

export interface OAuthTokens {
  idToken: string
  accessToken: string
  refreshToken: string
}

function redirectUri(): string {
  return `${window.location.origin}/auth/callback`
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomString(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

/** Sends the browser to Google (via Cognito). `next` is an unprefixed in-app path. */
export async function startGoogleSignIn(next: string, locale: 'en' | 'he'): Promise<void> {
  const pending: PendingSignIn = { state: randomString(24), verifier: randomString(48), next, locale }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  const params = new URLSearchParams({
    identity_provider: 'Google',
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: 'openid email profile aws.cognito.signin.user.admin',
    state: pending.state,
    code_challenge: await codeChallenge(pending.verifier),
    code_challenge_method: 'S256',
  })
  // External (Cognito's domain), not an in-app route, so the router can't do it.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${COGNITO_OAUTH_ORIGIN}/oauth2/authorize?${params}`)
}

export class OAuthCallbackError extends Error {
  constructor(public readonly code: 'cancelled' | 'state_mismatch' | 'exchange_failed' | 'provider_error', message: string) {
    super(message)
  }
}

/**
 * Cognito fails the one sign-in that links a Google identity to an existing
 * account ("Already found an entry for username", pre-signup.ts). Returns
 * true when the caller should start Google sign-in again (once per tab).
 */
export function shouldRetryAfterLink(errorDescription: string | null): boolean {
  if (!errorDescription?.includes('Already found an entry for username')) return false
  if (sessionStorage.getItem(RETRIED_KEY)) return false
  sessionStorage.setItem(RETRIED_KEY, '1')
  return true
}

/** Reads the pending sign-in without consuming it (for a retry or the locale). */
export function peekPendingSignIn(): Pick<PendingSignIn, 'next' | 'locale'> | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const { next, locale } = JSON.parse(raw) as PendingSignIn
    return { next, locale }
  } catch {
    return null
  }
}

/** Validates `state`, exchanges the code, and returns Cognito tokens plus where to go next. */
export async function completeGoogleSignIn(params: URLSearchParams): Promise<{ tokens: OAuthTokens; next: string; locale: 'en' | 'he' }> {
  const error = params.get('error')
  if (error) {
    throw new OAuthCallbackError(error === 'access_denied' ? 'cancelled' : 'provider_error', params.get('error_description') ?? error)
  }

  const raw = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  const pending = raw ? (JSON.parse(raw) as PendingSignIn) : null
  const code = params.get('code')
  if (!pending || !code || params.get('state') !== pending.state) {
    throw new OAuthCallbackError('state_mismatch', 'This sign-in link is no longer valid. Start again.')
  }

  const res = await fetch(`${COGNITO_OAUTH_ORIGIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: pending.verifier,
    }),
  })
  if (!res.ok) {
    throw new OAuthCallbackError('exchange_failed', `Token exchange failed (${res.status}).`)
  }
  const body = (await res.json()) as { id_token: string; access_token: string; refresh_token: string }
  sessionStorage.removeItem(RETRIED_KEY)
  return {
    tokens: { idToken: body.id_token, accessToken: body.access_token, refreshToken: body.refresh_token },
    next: pending.next,
    locale: pending.locale,
  }
}
