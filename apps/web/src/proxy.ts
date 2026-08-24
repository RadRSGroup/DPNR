import { NextRequest, NextResponse } from 'next/server'

/**
 * UX-only redirect gate (MVP_ARCHITECTURE.md §5.3) — as of Session 7's
 * alignment work, this reads the lightweight `dpnr_session`/`dpnr_consented`
 * cookies `lib/cognito/client.ts` maintains, not a Supabase server client.
 * Cognito's browser SDK keeps real tokens client-side (amazon-cognito-identity-js
 * has no server-readable session), so this can only check presence, never
 * validate a token — same non-enforcing role the Supabase-era version had
 * (see that file's own history), just without an SDK call to do it.
 * The real security boundary is unchanged: API Gateway's JWT authorizer on
 * every `/v1` call, plus each handler's own `requireConsent()`/ownership
 * check (ADR 0004).
 *
 * Default post-login landing changed to `/companion` this session
 * (docs/AGENT_LOG.md Session 13 — Companion frontend UI, workstream B) —
 * the user confirmed this in Session 12 part 3, ahead of Companion having
 * a page to route to; it does now. Dashboard (`/dashboard`) is unchanged
 * and stays one tap away, per the spec's own Golden Path B step 4 — this
 * is only which page a fresh login/consent lands on first.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get('dpnr_session')?.value === '1'
  const hasConsent = request.cookies.get('dpnr_consented')?.value === '1'

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/decision') ||
    pathname.startsWith('/companion') ||
    pathname.startsWith('/twin') ||
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/library')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isConsentPage = pathname.startsWith('/consent')

  // Unauthenticated → login
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated but no consent → consent gate
  if (isProtected && hasSession && !hasConsent) {
    const url = request.nextUrl.clone()
    url.pathname = '/consent'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already consented — skip consent page
  if (isConsentPage && hasConsent) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.searchParams.get('next') ?? '/companion'
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  // Already authenticated — skip auth pages
  if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/companion'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/decision/:path*',
    '/companion/:path*',
    '/twin/:path*',
    '/rooms/:path*',
    '/library/:path*',
    '/login',
    '/signup',
    '/consent',
  ],
}
