import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { resolveSafeNext } from '@/lib/navigation/safeNext'
import { buildSecurityHeaders } from '@/lib/securityHeaders'

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
 *
 * Security review 2026-09-14 (DPNR-10) — renamed from the exported `proxy`
 * to `resolveRoutingResponse`; the exported `proxy` below wraps this
 * unchanged function purely to attach security headers to whatever
 * response it decides on (redirect or pass-through), without touching any
 * of the routing logic itself. The incoming `request`'s headers already
 * carry `x-nonce` (set by `proxy` before calling this) by the time
 * `handleI18nRouting` reads them, so next-intl's own internal response
 * (and Next's subsequent render for a pass-through) sees it too.
 */
async function resolveRoutingResponse(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request)

  const { locale, path: pathname } = stripLocalePrefix(request.nextUrl.pathname)
  const hasSession = request.cookies.get('dpnr_session')?.value === '1'
  const hasConsent = request.cookies.get('dpnr_consented')?.value === '1'
  // Session 51 — one-time post-signin profile-setup screen (gender +
  // optional photo), gated the exact same way consent is: a cookie
  // mirroring an ID-token claim, checked after consent so a brand-new
  // signup always sees consent first, profile-setup second.
  const hasProfileSetup = request.cookies.get('dpnr_profile_setup')?.value === '1'
  // First-Time Onboarding (docs/FIRST_TIME_ONBOARDING_PLAN.md §4, §5.4) —
  // same cookie-mirrors-claim gate, checked after profile-setup so the
  // order is always consent -> profile-setup -> onboarding. §5.6 originally
  // put this behind its own `/onboarding` route; revisited 2026-09-16 at
  // the user's request to match the reference screenshot (onboarding runs
  // inside Main Chat itself, not a standalone screen) — so this gate now
  // routes straight to `/companion`, which renders the flow inline
  // (`useOnboardingFlow`), instead of a dedicated page.
  const hasOnboarding = request.cookies.get('dpnr_onboarding')?.value === '1'

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
  const isProfileSetupPage = pathname.startsWith('/profile-setup')

  // Unauthenticated → login. `next` is stored UNPREFIXED — login/page.tsx
  // and consent/page.tsx both consume it via the locale-aware
  // `router.push(next)` (from `@/i18n/navigation`), which adds the current
  // locale prefix itself. Storing an already-prefixed value here would
  // get double-prefixed there (`/he/he/companion`) — a real bug this
  // session hit and fixed live, not a hypothetical.
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/login', locale)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated but no consent → consent gate. Same unprefixed-`next`
  // rule as above.
  if (isProtected && hasSession && !hasConsent) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/consent', locale)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Consented but profile-setup not done yet → profile-setup gate. Same
  // unprefixed-`next` rule as the login/consent gates above; runs for
  // every navigation (including a client-side `router.push` from
  // consent/page.tsx's own handleAccept), so that page doesn't need to
  // know about this step at all — it just pushes `next` like it always
  // did, and lands on /profile-setup first if this is a fresh signup.
  if (isProtected && hasSession && hasConsent && !hasProfileSetup) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/profile-setup', locale)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Profile-setup done but onboarding not yet — onboarding gate. Routes to
  // `/companion` itself (not a separate page — see `hasOnboarding`'s own
  // comment above); Main Chat renders the onboarding flow inline instead
  // of whatever page was actually requested, same as the other gates
  // above but reusing an existing protected route rather than needing a
  // dedicated one. Same unprefixed-`next` rule as the gates above.
  // `pathname !== '/companion'` guards against a self-redirect loop this
  // gate would otherwise create when the requested page already IS
  // `/companion` (redirecting `/companion` to itself, forever) — a real
  // `ERR_TOO_MANY_REDIRECTS` hit and fixed live while building this.
  if (isProtected && pathname !== '/companion' && hasSession && hasConsent && hasProfileSetup && !hasOnboarding) {
    const url = request.nextUrl.clone()
    url.pathname = withLocale('/companion', locale)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already consented — skip consent page. This branch redirects directly
  // via `NextResponse.redirect`, not the client-side locale-aware router,
  // so — unlike login/consent's own `router.push(next)` — `next` DOES need
  // prefixing here, at the point of use, not when it was stored above.
  // Routes through /profile-setup, then `/companion` (for its inline
  // onboarding), if either isn't done yet — same `next` carried forward
  // either way.
  if (isConsentPage && hasConsent) {
    const url = request.nextUrl.clone()
    // Validated (DPNR-03) even though this branch only ever forwards a
    // pathname, not a full URL — `url.pathname =` can't switch origin, but
    // an unvalidated value could still smuggle an unexpected path/query.
    const next = resolveSafeNext(request.nextUrl.searchParams.get('next'))
    if (!hasProfileSetup) {
      url.pathname = withLocale('/profile-setup', locale)
      url.searchParams.set('next', next ?? '/companion')
    } else if (!hasOnboarding) {
      url.pathname = withLocale('/companion', locale)
      url.searchParams.set('next', next ?? '/companion')
    } else {
      url.pathname = next ? withLocale(next, locale) : withLocale('/companion', locale)
      url.searchParams.delete('next')
    }
    return NextResponse.redirect(url)
  }

  // Profile-setup already done — skip that screen. Same shape as the
  // consent-page-skip branch above; routes to `/companion` next (for its
  // inline onboarding) if that's not done yet either.
  if (isProfileSetupPage && hasProfileSetup) {
    const url = request.nextUrl.clone()
    const next = resolveSafeNext(request.nextUrl.searchParams.get('next'))
    if (!hasOnboarding) {
      url.pathname = withLocale('/companion', locale)
      url.searchParams.set('next', next ?? '/companion')
    } else {
      url.pathname = next ? withLocale(next, locale) : withLocale('/companion', locale)
      url.searchParams.delete('next')
    }
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

/**
 * Security review 2026-09-14 (DPNR-10) — this app shipped with no CSP or
 * other security headers at all. Generates a fresh per-request nonce,
 * mutates the incoming request's own headers to carry it as `x-nonce`
 * *before* delegating to `resolveRoutingResponse` (so next-intl's internal
 * response — and Next's render for a pass-through — reads it too, per
 * Next.js's own documented CSP-nonce middleware pattern: App Router
 * automatically applies a nonce found this way to its own
 * framework-generated inline scripts), then attaches the CSP plus the rest
 * of the standard header set to whatever response comes back, redirect or
 * pass-through alike.
 */
export async function proxy(request: NextRequest) {
  // btoa/crypto.randomUUID, not Buffer — this middleware runs in the Edge
  // Runtime (no explicit `runtime: 'nodejs'` in this file's own `config`
  // below), where Buffer isn't guaranteed available but both Web APIs are.
  const nonce = btoa(crypto.randomUUID())
  request.headers.set('x-nonce', nonce)

  const response = await resolveRoutingResponse(request)

  for (const [name, value] of Object.entries(buildSecurityHeaders(nonce))) {
    response.headers.set(name, value)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
}
