import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()
globalThis.sessionStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage
const assign = vi.fn()
globalThis.window = { location: { origin: 'https://dpnr-mvp.onrender.com', assign } } as unknown as Window & typeof globalThis

const { startGoogleSignIn, completeGoogleSignIn, shouldRetryAfterLink, OAuthCallbackError } = await import('./oauth')

describe('Google OAuth helpers', () => {
  beforeEach(() => {
    store.clear()
    assign.mockReset()
  })

  it('redirects straight to Google with PKCE and a stored state', async () => {
    await startGoogleSignIn('/dashboard', 'he')
    const url = new URL(assign.mock.calls[0][0])
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('identity_provider')).toBe('Google')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('redirect_uri')).toBe('https://dpnr-mvp.onrender.com/auth/callback')
    const pending = JSON.parse(store.get('dpnr_oauth_pending')!)
    expect(url.searchParams.get('state')).toBe(pending.state)
    expect(pending).toMatchObject({ next: '/dashboard', locale: 'he' })
  })

  it('rejects a callback whose state does not match', async () => {
    await startGoogleSignIn('/dashboard', 'en')
    await expect(completeGoogleSignIn(new URLSearchParams({ code: 'c', state: 'forged' }))).rejects.toMatchObject({ code: 'state_mismatch' })
  })

  it('exchanges the code with the stored verifier', async () => {
    await startGoogleSignIn('/growth', 'en')
    const { state, verifier } = JSON.parse(store.get('dpnr_oauth_pending')!)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id_token: 'i', access_token: 'a', refresh_token: 'r' }), { status: 200 }),
    )
    globalThis.fetch = fetchMock
    const result = await completeGoogleSignIn(new URLSearchParams({ code: 'the-code', state }))
    expect(result).toEqual({ tokens: { idToken: 'i', accessToken: 'a', refreshToken: 'r' }, next: '/growth', locale: 'en' })
    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body)
    expect(body.get('code_verifier')).toBe(verifier)
    expect(body.get('grant_type')).toBe('authorization_code')
  })

  it('treats a cancelled Google prompt as cancelled', async () => {
    await expect(completeGoogleSignIn(new URLSearchParams({ error: 'access_denied' }))).rejects.toBeInstanceOf(OAuthCallbackError)
  })

  it('retries the account-link failure once per tab', () => {
    const msg = 'PreSignUp failed ... Already found an entry for username google_1'
    expect(shouldRetryAfterLink(msg)).toBe(true)
    expect(shouldRetryAfterLink(msg)).toBe(false)
    expect(shouldRetryAfterLink('something else')).toBe(false)
  })
})
