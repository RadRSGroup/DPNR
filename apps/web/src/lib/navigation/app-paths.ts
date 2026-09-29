/**
 * The signed-in app's routes (unprefixed, no locale). One list for both the
 * proxy's sign-in/consent gate and the client's visit gate
 * (components/layout/VisitGate.tsx), so the two can't drift apart.
 */
export const APP_PATH_PREFIXES = [
  '/dashboard',
  '/decision',
  '/companion',
  '/twin',
  '/rooms',
  '/library',
  '/mirror',
  '/journal',
  // Session 83: these (app) pages were only guarded client-side.
  '/growth',
  '/evolution-map',
  '/account',
  '/wallet',
  '/therapist-summary',
] as const

export function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
