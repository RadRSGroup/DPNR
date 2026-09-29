'use client'
import { useLocale, useTranslations } from 'next-intl'

/**
 * Cognito SDK errors (amazon-cognito-identity-js) carry an English-only
 * `message` plus a stable `code`/`name`. The sign-in, sign-up, reset and
 * password-change screens used to show `err.message` raw, so a Hebrew UI
 * showed English errors. This maps the common codes to `Shared.authErrors`.
 *
 * English keeps showing the SDK's own message (unchanged behaviour, and it
 * is more specific than a generic line); other locales get the mapped text,
 * or the screen's own translated fallback for anything unmapped. Nothing
 * here changes which error is thrown or how callers branch on it.
 */
const COGNITO_ERROR_KEYS: Record<string, string> = {
  NotAuthorizedException: 'incorrectCredentials',
  UserNotFoundException: 'userNotFound',
  UsernameExistsException: 'userExists',
  AliasExistsException: 'userExists',
  CodeMismatchException: 'codeMismatch',
  ExpiredCodeException: 'codeExpired',
  InvalidPasswordException: 'invalidPassword',
  LimitExceededException: 'tooManyAttempts',
  TooManyRequestsException: 'tooManyAttempts',
  TooManyFailedAttemptsException: 'tooManyAttempts',
  UserNotConfirmedException: 'notConfirmed',
  InvalidParameterException: 'invalidParameter',
  NetworkError: 'network',
}

/** The `Shared.authErrors` key for a Cognito/auth error, or null if unmapped. */
export function authErrorKey(err: unknown): string | null {
  if (!(err instanceof Error)) return null
  // Thrown by lib/cognito/client.ts itself when there is no signed-in user.
  if (err.message === 'No active session.') return 'noActiveSession'
  const code = (err as Error & { code?: unknown }).code ?? err.name
  if (typeof code !== 'string') return null
  // Cognito reports a lockout as NotAuthorized with this message.
  if (code === 'NotAuthorizedException' && /attempts exceeded/i.test(err.message)) return 'tooManyAttempts'
  return COGNITO_ERROR_KEYS[code] ?? null
}

/** Returns `(err, fallback) => string` for showing an auth error in the current locale. */
export function useAuthErrorMessage(): (err: unknown, fallback: string) => string {
  const locale = useLocale()
  const t = useTranslations('Shared.authErrors')
  return (err, fallback) => {
    if (locale === 'en') return err instanceof Error && err.message ? err.message : fallback
    const key = authErrorKey(err)
    return key ? t(key) : fallback
  }
}
