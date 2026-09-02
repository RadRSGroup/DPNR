/**
 * WebAuthn PRF-extension helpers for the OAuth-path KEK derivation
 * (aws-migration-plan.html §6.2). This is the one module in this directory
 * that can't be exercised by a fixed-vector test — it calls
 * `navigator.credentials`, which only a real platform authenticator (or a
 * mocked one) can answer. Unit tests mock `navigator.credentials` rather
 * than skipping coverage entirely; there's no live authenticator in CI.
 *
 * Registering/deriving the PRF secret has no dependency on which identity
 * provider fronted sign-in — it's usable the moment Google OAuth itself is
 * wired up in Cognito (still blocked on external credentials, see
 * docs/adr/0009-crypto-contract-v1.md), not before.
 */

// Fixed, public, application-specific salt for the PRF `eval.first` input.
// Not a secret — its only job is to namespace this app's derived PRF
// secret away from any other relying party that might reuse the same
// passkey; the security of the derived value rests entirely on the
// authenticator-held PRF key, not on this salt being hidden.
const PRF_SALT = new TextEncoder().encode('dpnr-crypto-v1/passkey-prf-salt')

interface PrfExtensionResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } }
}

export interface PasskeyRegistration {
  credentialId: ArrayBuffer
  /** If false, this authenticator doesn't support PRF — the caller must fall back to `deriveKekFromEncryptionPassphrase` instead of the passkey path for this user. */
  prfSupported: boolean
}

export async function registerEncryptionPasskey(params: {
  userId: Uint8Array
  userName: string
  challenge: Uint8Array
}): Promise<PasskeyRegistration> {
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'DPNR' },
      user: { id: params.userId.slice().buffer as ArrayBuffer, name: params.userName, displayName: params.userName },
      challenge: params.challenge.slice().buffer as ArrayBuffer,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256, for authenticators without ES256
      ],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      extensions: { prf: { eval: { first: PRF_SALT.buffer as ArrayBuffer } } },
    } as PublicKeyCredentialCreationOptions,
  })) as PublicKeyCredential

  const extResults = credential.getClientExtensionResults() as PrfExtensionResults
  return { credentialId: credential.rawId, prfSupported: Boolean(extResults.prf?.enabled) }
}

/**
 * Re-derives the same PRF secret on a later sign-in — deterministic given
 * the same credential + fixed salt, which is what lets it stand in for a
 * password in `deriveKekFromPasskeyPrf`. Throws if this authenticator
 * doesn't support PRF; callers should have already routed such users to
 * the encryption-passphrase fallback at registration time, so hitting this
 * here means state has drifted (e.g. a new authenticator was added without
 * going through that check again).
 */
export async function derivePasskeyPrfSecret(params: { credentialId: ArrayBuffer; challenge: Uint8Array }): Promise<Uint8Array> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: params.challenge.slice().buffer as ArrayBuffer,
      allowCredentials: [{ id: params.credentialId, type: 'public-key' }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: PRF_SALT.buffer as ArrayBuffer } } },
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential

  const extResults = assertion.getClientExtensionResults() as PrfExtensionResults
  const secret = extResults.prf?.results?.first
  if (!secret) {
    throw new Error('This authenticator did not return a PRF result — use the encryption-passphrase fallback instead.')
  }
  return new Uint8Array(secret)
}
