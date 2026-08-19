import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js'

/**
 * The app's unified session, as of Session 7's alignment work — Cognito
 * replaces Supabase for authentication (docs/AGENT_LOG.md Session 7 part 4).
 * `WebClient` (infra/cdk/lib/auth-stack.ts) has no secret and SRP auth
 * enabled, so this SDK can talk to it directly from the browser with no
 * backend proxy needed for sign-in itself.
 */
const userPool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
})

// A lightweight, non-httpOnly cookie mirroring "is there a session" for
// proxy.ts's UX-only redirect gate — NOT a security boundary, same as the
// Supabase-era proxy.ts never was one either (MVP_ARCHITECTURE.md §5.3
// calls proxy.ts a "UX-only redirect"). The real boundary is API
// Gateway's JWT authorizer validating the actual token on every /v1 call,
// plus each handler's own ownership check (ADR 0004's "per-handler check
// completes the story" principle).
const SESSION_COOKIE = 'dpnr_session'
// Mirrors the ID token's `custom:consent` claim (pre-token-generation.ts,
// ADR 0004) so proxy.ts can gate /consent without decoding a JWT itself.
// This is a UX convenience only — the real enforcement is each handler's
// own `requireConsent()` DynamoDB read (docs/PHASE_AUDIT.md §2.2), which
// this claim does not feed into at all (api-stack.ts's own doc comment:
// the built-in JWT authorizer doesn't enforce this claim either).
const CONSENT_COOKIE = 'dpnr_consented'

function setSessionCookie(session: CognitoUserSession): void {
  const idToken = session.getIdToken()
  const expiresAt = idToken.getExpiration() * 1000
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${maxAge}; samesite=lax`

  const consented = idToken.payload['custom:consent'] === 'true'
  document.cookie = consented
    ? `${CONSENT_COOKIE}=1; path=/; max-age=${maxAge}; samesite=lax`
    : `${CONSENT_COOKIE}=; path=/; max-age=0`
}

function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`
  document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
}

/**
 * Called right after `POST /v1/user/consent` succeeds — optimistic, since
 * the current ID token's `custom:consent` claim won't reflect the grant
 * until the next token refresh (up to `idTokenValidity`, 1 hour). Fine for
 * this cookie's UX-only purpose; the backend's real gate reads DynamoDB
 * directly on every call, not this claim.
 */
export function markConsentedLocally(): void {
  document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=3600; samesite=lax`
}

export function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userPool.signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: 'email', Value: email })],
      [],
      (err) => (err ? reject(err) : resolve())
    )
  })
}

/** Cognito's `autoVerify: { email: true }` (auth-stack.ts) requires a code, not a magic link. */
export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()))
  })
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    user.resendConfirmationCode((err) => (err ? reject(err) : resolve()))
  })
}

export function signIn(email: string, password: string): Promise<CognitoUserSession> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    const authDetails = new AuthenticationDetails({ Username: email, Password: password })
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        setSessionCookie(session)
        resolve(session)
      },
      onFailure: (err) => reject(err),
    })
  })
}

export function signOut(): void {
  userPool.getCurrentUser()?.signOut()
  clearSessionCookie()
}

/** Resolves the current session, auto-refreshing via the refresh token if the access/ID token expired. Null if signed out. */
export function getCurrentSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser()
    if (!user) {
      resolve(null)
      return
    }
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) {
        resolve(null)
        return
      }
      setSessionCookie(session) // keep the UX cookie's expiry in sync with the real (possibly just-refreshed) token
      resolve(session)
    })
  })
}

/**
 * The ID token — this is what the `/v1` API's JWT authorizer needs, not the
 * access token. Cognito access tokens have no `aud` claim at all (they carry
 * `client_id` instead); API Gateway's HttpApi JWT authorizer is configured
 * with `jwtAudience: [userPoolClientId]` (infra/cdk/lib/api-stack.ts), which
 * only the ID token's `aud` claim can satisfy.
 */
export async function getIdToken(): Promise<string | null> {
  const session = await getCurrentSession()
  return session ? session.getIdToken().getJwtToken() : null
}
