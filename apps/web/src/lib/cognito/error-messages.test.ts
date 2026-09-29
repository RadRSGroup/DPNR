import { describe, it, expect } from 'vitest'
import { authErrorKey } from './error-messages'

function cognitoError(code: string, message: string) {
  return Object.assign(new Error(message), { code, name: code })
}

describe('authErrorKey', () => {
  it('maps Cognito codes', () => {
    expect(authErrorKey(cognitoError('NotAuthorizedException', 'Incorrect username or password.'))).toBe('incorrectCredentials')
    expect(authErrorKey(cognitoError('CodeMismatchException', 'Invalid verification code provided'))).toBe('codeMismatch')
    expect(authErrorKey(cognitoError('UsernameExistsException', 'An account with the given email already exists.'))).toBe('userExists')
  })
  it('treats the lockout message as too many attempts', () => {
    expect(authErrorKey(cognitoError('NotAuthorizedException', 'Password attempts exceeded'))).toBe('tooManyAttempts')
  })
  it('recognises the client wrapper’s own no-session error', () => {
    expect(authErrorKey(new Error('No active session.'))).toBe('noActiveSession')
  })
  it('returns null for anything unmapped', () => {
    expect(authErrorKey(new Error('boom'))).toBeNull()
    expect(authErrorKey('not an error')).toBeNull()
  })
})
