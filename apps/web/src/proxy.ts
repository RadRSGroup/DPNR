import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

const handleI18nRouting = createMiddleware(routing)

/**
 * `routing.localePrefix: 'as-needed'` means `en` (the default) is never
 * prefixed and `he` always is — so "does the incoming path start with
 * `/he`" is a complete, correct locale check for this app; it doesn't need
 * to duplicate next-intl's own Accept-Language/cookie negotiation.
 */
function stripLocalePrefix(pathname: string): { locale: 'en' | 'he'; path: string } {
  if (pathname === '/he' || pathname.startsWith('/he/')) {
    return { locale: 'he', path: pathname.slice(3) || '/' }
  }
  return { locale: 'en', path: pathname }
}

function withLocale(path: string, locale: 'en' | 'he'): string {
  if (locale !== 'he') return path
  return path === '/' ? '/he' : `/he${path}`
}

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
 *
 * Session 49 (Hebrew localization Slice A): merged next-intl's locale
 * routing into this same function — Next.js only supports one proxy file,
 * so it can't run alongside this gate, only inside it (see
 * docs/HEBREW_LOCALIZATION_PLAN.md §4.1). `handleI18nRouting` runs first on
 * every request; the gate below then evaluates against the de-prefixed
 * path and, whenever IT decides to redirect, builds a locale-aware target
 * with `withLocale()` instead of returning next-intl's own response.
 * Otherwise (no gate redirect needed) next-intl's response — which may
 * itself be a locale redirect/rewrite/cookie-set — passes through
 * untouched. Known, accepted rough edge: an unauthenticated, Hebrew-
 * preferring visitor whose very first request is a direct deep link to a
 * protected, unprefixed route (no `/he` in the URL, no `NEXT_LOCALE`
 * cookie yet) gets redirected to unprefixed `/login` by this gate first,
 * then to `/he/login` by next-intl on the following request — one extra
 * hop, not a correctness bug, and not worth fully re-deriving next-intl's
 * own negotiation logic here just to collapse.
 */
export async function proxy(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request)

  const { locale, path: pathname } = stripLocalePrefix(request.nextUrl.pathname)
  const hasSession = request.cookies.get('dpnr_session')?.value === '1'
  const hasConsent = request.cookies.get('dpnr_consented')?.value === '1'

  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/decision') ||
    pathname.startsWith('/companion') ||
    pathname.startsWith('/twin') ||
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/mirror')
  // /signup deliberately excluded from this gate — see the "Already
  // authenticated" check below for why.
  const isLoginPage = pathname.startsWith('/login')
  const isConsentPage = pathname.startsWith('/consent')

  // Unauthenticated → login
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/login', locale)
    url.searchParams.set('next', withLocale(pathname, locale))
    return NextResponse.redirect(url)
  }

  // Authenticated but no consent → consent gate
  if (isProtected && hasSession && !hasConsent) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/consent', locale)
    url.searchParams.set('next', withLocale(pathname, locale))
    return NextResponse.redirect(url)
  }

  // Already consented — skip consent page
  if (isConsentPage && hasConsent) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.searchParams.get('next') ?? withLocale('/companion', locale)
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  // Already authenticated — skip /login (revisiting it while signed in has
  // no purpose). /signup is deliberately NOT included here: clicking
  // "Create an account" while already signed in as someone else is a
  // real, deliberate way to make a second account, not a mistaken
  // revisit — Cognito's own `signIn()` (lib/cognito/client.ts) replaces
  // `LastAuthUser` in localStorage on success, so completing signup here
  // correctly switches to the new account rather than colliding with the
  // old session. Found and fixed after the user reported "Create an
  // account" bounced them straight back into their existing signed-in
  // profile instead of the signup form.
  if (isLoginPage && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/companion', locale)
    return NextResponse.redirect(url)
  }

  return i18nResponse
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
