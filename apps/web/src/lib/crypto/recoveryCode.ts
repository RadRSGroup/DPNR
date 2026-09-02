import { RECOVERY_CODE_ENTROPY_BYTES, RECOVERY_CODE_GROUP_SIZE } from './constants'
import { bytesToBase32 } from './encoding'

export interface RecoveryCode {
  /** The raw entropy — feed this to `deriveKekFromRecoveryCode`, never the display string directly. */
  bytes: Uint8Array
  /** What the user actually sees and writes down: base32, grouped for readability (e.g. "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2-3456-789A"). */
  display: string
}

/**
 * Generates a new recovery code at key-setup time. Per ADR 0001, this is a
 * launch blocker, not polish: show `display` exactly once, and the caller
 * MUST get an explicit "if you lose this, your data is unrecoverable"
 * acknowledgment before proceeding — do not soften that copy.
 */
export function generateRecoveryCode(): RecoveryCode {
  const bytes = crypto.getRandomValues(new Uint8Array(RECOVERY_CODE_ENTROPY_BYTES))
  return { bytes, display: formatRecoveryCode(bytesToBase32(bytes)) }
}

function formatRecoveryCode(raw: string): string {
  const groups: string[] = []
  for (let i = 0; i < raw.length; i += RECOVERY_CODE_GROUP_SIZE) {
    groups.push(raw.slice(i, i + RECOVERY_CODE_GROUP_SIZE))
  }
  return groups.join('-')
}

/** Parses a user-entered recovery code (with or without the display formatting) back into raw bytes for `deriveKekFromRecoveryCode`. Throws if the checksum-free base32 decode produces the wrong length — a typo, not a cryptographic failure, so callers should show "check the code and try again," not a generic error. */
export function parseRecoveryCode(input: string): Uint8Array {
  const compact = input.replace(/[\s-]/g, '').toUpperCase()
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of compact) {
    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error('Invalid recovery code: unexpected character')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  const result = new Uint8Array(bytes)
  if (result.length !== RECOVERY_CODE_ENTROPY_BYTES) {
    throw new Error(`Invalid recovery code: expected ${RECOVERY_CODE_ENTROPY_BYTES} bytes, decoded ${result.length}`)
  }
  return result
}
