/**
 * Security review 2026-09-14 (DPNR-10) — centralizes the header set
 * `proxy.ts` attaches to every response. Kept separate from `proxy.ts`
 * itself so the CSP's allowlist (the part most likely to need a one-line
 * change when a new external origin is introduced) isn't buried inside the
 * routing-gate file's own, already-dense logic.
 */
export function buildSecurityHeaders(nonce: string): Record<string, string> {
  const apiOrigin = safeOrigin(process.env.NEXT_PUBLIC_DPNR_API_URL)
  const cognitoOrigin = cognitoIdpOrigin(process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID)
  const s3UploadOrigin = s3RegionalWildcard(process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID)
  // Verified live (2026-09-22, this slice): React dev mode genuinely needs
  // eval() for its debugging/stack-reconstruction tooling — confirmed via a
  // real CSP violation in the browser console ("React will never use
  // eval() in production mode", straight from React's own error text).
  // Scoped to development only so production stays eval()-free, matching
  // the security review's explicit "no unsafe-eval" ask.
  const isDev = process.env.NODE_ENV === 'development'

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets scripts the initially-nonced script loads
    // (Next's own chunked bundles) run without each needing the nonce
    // individually — the standard Next.js App Router CSP pattern.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind ships a static compiled stylesheet (no runtime CSS-in-JS
    // here), but Next itself injects a handful of inline style attributes
    // (e.g. font-loading, dev overlay) — unsafe-inline for style is a much
    // smaller concession than for script, since it can't execute code.
    "style-src 'self' 'unsafe-inline'",
    // Avatar/chat-background images are presigned S3 URLs rendered via a
    // plain <img> (see companion/page.tsx's own comment on why they're
    // not next/image-eligible) — needs a real AWS origin, not just 'self'.
    "img-src 'self' data: blob: https://*.amazonaws.com",
    "font-src 'self' data:", // fonts are self-hosted from src/fonts via next/font/local — no external font origin needed
    // amazon-cognito-identity-js calls Cognito's IDP directly from the
    // browser; the app's own /v1 API is a different origin too. A CSP
    // source expression's wildcard is only valid as the leftmost hostname
    // label (confirmed live: `cognito-idp.*.amazonaws.com` is rejected by
    // the browser as invalid and silently dropped, not just a lint
    // nitpick) — the real region, derived from the pool id's own
    // `<region>_<id>` shape, not a wildcard.
    //
    // Session 67: profile-photo and chat-background uploads PUT straight
    // from the browser to S3 via a presigned URL (avatar-upload-url.ts /
    // chat-background-upload-url.ts) — without the bucket's regional S3
    // host here every upload was blocked by this directive (found live:
    // "violates ... connect-src"), since this header set first shipped.
    // Leftmost-label wildcard (the only valid position), same region.
    `connect-src 'self'${cognitoOrigin ? ` ${cognitoOrigin}` : ''}${apiOrigin ? ` ${apiOrigin}` : ''}${s3UploadOrigin ? ` ${s3UploadOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // this app is never meant to be framed by anything, including itself
    'upgrade-insecure-requests',
  ].join('; ')

  return {
    'Content-Security-Policy': csp,
    // Belt-and-suspenders alongside frame-ancestors for browsers that only
    // honor the older header.
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Deny every powerful browser feature this app has no use for, rather
    // than enumerating one that might get added later and forgotten here.
    // microphone=(self): Main Chat's dictation button (Web Speech API) needs
    // the mic on this app's own origin — `microphone=()` silently disabled it.
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
    // Only meaningful over HTTPS (the local dev server ignores it); real
    // deploys (Render) terminate TLS at the edge in front of this app.
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }
}

function safeOrigin(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/** A Cognito user pool id is always `<region>_<id>` (e.g. `us-east-1_AbCdEfGhI`) — the region prefix IS the IDP's own hostname region. */
function cognitoIdpOrigin(userPoolId: string | undefined): string | null {
  const region = userPoolId?.split('_')[0]
  return region ? `https://cognito-idp.${region}.amazonaws.com` : null
}

/** Presigned S3 uploads go to `<bucket>.s3.<region>.amazonaws.com`; the app's AWS region is the Cognito pool's. */
function s3RegionalWildcard(userPoolId: string | undefined): string | null {
  const region = userPoolId?.split('_')[0]
  return region ? `https://*.s3.${region}.amazonaws.com` : null
}
