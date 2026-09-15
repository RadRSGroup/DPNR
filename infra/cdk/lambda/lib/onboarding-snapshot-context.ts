import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  LIFE_DOMAIN_LABELS,
  INTERACTION_PREFERENCE_TO_MODE,
  type OnboardingSnapshotItem,
  type OnboardingCurrentState,
  type OnboardingDesiredState,
  type LifeDomainCategory,
} from '@dpnr/shared-types'
import type { SessionCrypto } from './session-crypto'

/**
 * First-Time Onboarding, Slice D (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4/§5.1)
 * — the one genuinely new integration point in the whole plan: feeding the
 * card-sequence answers into the *existing* `companion/onboard` prompt
 * (`companion/message.ts`'s `runOnboardingTurn`, `companion/context.ts`'s
 * `synthesizeOnboardingOpener`) as real starting context, so the very first
 * orienting question already reflects "DPNR already understands something
 * about where I am right now" instead of starting from zero.
 *
 * English-only by design, same as `LIFE_DOMAIN_LABELS`'s own established
 * use in Dashboard/Growth Tracker/My Evolution Map — this text only ever
 * feeds a Bedrock prompt's internal context, never rendered to the user
 * directly (the model's actual reply is still governed by
 * `{{languageInstruction}}`), so there's no localization gap here to carry
 * forward into a future Hebrew slice.
 */
const CURRENT_STATE_LABELS: Record<OnboardingCurrentState, string> = {
  growing: 'Growing',
  changing: 'Changing',
  figuring_things_out: 'Figuring things out',
  pretty_good: 'Pretty good',
  stuck_somewhere: 'Stuck somewhere',
  a_lot_right_now: 'A lot right now',
  something_else: 'Something else',
}

const DESIRED_STATE_LABELS: Record<OnboardingDesiredState, string> = {
  clarity: 'Clarity',
  peace: 'Peace',
  energy: 'Energy',
  connection: 'Connection',
  confidence: 'Confidence',
  freedom: 'Freedom',
  direction: 'Direction',
  fun: 'Fun',
  courage: 'Courage',
  space: 'Space',
}

// Reverses Slice A's own INTERACTION_PREFERENCE_TO_MODE map — every stored
// interactionPreference value came from that map's image (Card 4 only ever
// writes one of its 6 mapped modes), so the reverse lookup always hits.
const MODE_TO_PREFERENCE_LABEL = Object.fromEntries(
  Object.entries(INTERACTION_PREFERENCE_TO_MODE).map(([label, mode]) => [mode, label])
) as Record<string, string>

/**
 * Builds the `{{onboardingSnapshot}}` context block for the `onboard`
 * prompt, or a plain "(no onboarding intake available)" sentinel when the
 * caller has no `OnboardingSnapshotItem` yet (a legacy account that never
 * went through the new flow) — same "never fabricate, degrade honestly"
 * tolerance every other best-effort read in this codebase uses
 * (`getProfileForLanguage`, `maybeSynthesizeContinuation`). Never throws.
 */
export async function getOnboardingSnapshotContext(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  crypto: SessionCrypto
): Promise<string> {
  const NO_INTAKE = '(no onboarding intake available — this person has no recorded intake, or it predates this feature)'
  try {
    const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.onboardingSnapshot() } }))
    const item = result.Item as OnboardingSnapshotItem | undefined
    if (!item) return NO_INTAKE

    const lines: string[] = []
    if (item.currentState) lines.push(`- Right now: ${CURRENT_STATE_LABELS[item.currentState]}`)
    if (item.activeDomains.length > 0) {
      lines.push(`- Life in focus: ${item.activeDomains.map((d) => LIFE_DOMAIN_LABELS[d]).join(', ')}`)
    }
    if (item.desiredStates.length > 0) {
      lines.push(`- Wants more of: ${item.desiredStates.map((d) => DESIRED_STATE_LABELS[d]).join(', ')}`)
    }
    if (item.interactionPreference) {
      lines.push(`- Prefers to be met by: ${MODE_TO_PREFERENCE_LABEL[item.interactionPreference] ?? item.interactionPreference}`)
    }
    if (item.currentIntention) {
      // Best-effort: a decrypt failure here (e.g. no session ticket) should
      // drop this one line, not break onboarding-turn context entirely —
      // every other field above is plaintext and unaffected either way.
      try {
        const { text } = await crypto.decryptField<{ text: string }>(item.currentIntention)
        if (text.trim()) lines.push(`- In their own words, what they want help with: "${text.trim()}"`)
      } catch {
        // fall through — the rest of the intake is still useful context
      }
    }

    return lines.length > 0 ? lines.join('\n') : NO_INTAKE
  } catch {
    return NO_INTAKE
  }
}

/**
 * Plain, no-crypto read of just the caller's onboarding `activeDomains` —
 * First-Time Onboarding Slice E (`docs/FIRST_TIME_ONBOARDING_PLAN.md` §4):
 * "an earlier signal to rank against" for Library recommendations and
 * Pull-a-Card before any real confirmed Twin signal exists yet. Unlike
 * `getOnboardingSnapshotContext` above, this never touches `currentIntention`
 * (the one encrypted field on this item), so it needs no `SessionCrypto`/
 * session ticket at all — same "degrade to empty, never throw" tolerance,
 * an empty array reads identically to "no snapshot yet" for a caller.
 */
export async function getOnboardingActiveDomains(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<LifeDomainCategory[]> {
  try {
    const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.onboardingSnapshot() } }))
    const item = result.Item as OnboardingSnapshotItem | undefined
    return item?.activeDomains ?? []
  } catch {
    return []
  }
}
