import { randomUUID } from 'node:crypto'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  SafetyClassificationSchema,
  type SafetyEventItem,
  type SafetySourceSurface,
  type SafetyClassification,
} from '@dpnr/shared-types'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'

const sns = new SNSClient({})

const SAFETY_EVENT_TTL_SECONDS = 90 * 24 * 60 * 60 // 90 days, ADR 0012

// Stage 2 (Rooms) heuristic — a Room command's `input` is a flexible
// Record<string, unknown> (packages/shared-types/src/api/command-contract.ts:
// RoomCommandRequestSchema.input) whose fields range from real free-text
// disclosures (a decision's narrative, a Mirror Room situation/coping
// response) to short structural values (an option label like "A", a lens
// slug, a tag array). Classifying every field regardless would double the
// Bedrock calls on every trivial selection — this length floor is a cheap,
// documented, revisit-with-real-data filter (same "first pass" status as
// alignment-score.ts's own thresholds): short values are assumed
// non-narrative and skipped entirely, so a command with nothing above this
// length makes no classification call at all.
const MIN_FREE_TEXT_LENGTH = 20

/**
 * Pulls whatever looks like real free text out of a Room command's `input`
 * bag for a safety check — a shallow scan (this codebase's step handlers
 * consistently keep free-text fields flat, never nested; see e.g.
 * mirror-steps/pattern.ts's `copingResponse`/`recurringPattern`) over every
 * string value at least `MIN_FREE_TEXT_LENGTH` characters long, joined with
 * blank lines. Returns `null` when nothing qualifies (a REFINE step like
 * decision-steps/deep-exploration.ts's `{optionLabel: 'A'}` has no free text
 * of its own — the narrative it references was already classified when it
 * was first submitted at an earlier step).
 */
export function extractFreeTextForSafetyCheck(input: Record<string, unknown>): string | null {
  const values = Object.values(input).filter(
    (v): v is string => typeof v === 'string' && v.length >= MIN_FREE_TEXT_LENGTH
  )
  return values.length > 0 ? values.join('\n\n') : null
}

/**
 * Safety/crisis classification (spec §30, scoped in
 * `docs/SAFETY_SYSTEM_DESIGN.md`, decided in ADR 0012) — Stage 1 wired into
 * Companion (`companion/message.ts`); Stage 2 wired into Rooms'
 * `command.ts` dispatcher via `extractFreeTextForSafetyCheck()` above.
 * Every caller passes its own `ddb`/`tableName` (same convention as
 * `lib/alignment-score.ts`) since this runs from multiple Lambdas.
 *
 * Classifier-failure behavior is spec-mandated, not a local judgment call:
 * §32's Failure States table says "AI extraction failure: Keep session
 * usable; queue retry; do not create fake signals." A malformed/failed
 * classification degrades to `normal` (conversation continues unaffected)
 * rather than either blocking the turn or guessing into a crisis state —
 * guessing wrong in the alarming direction on a parsing glitch would itself
 * be a bad, confusing experience for someone who said nothing concerning.
 */
export async function classifySafety(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  promptRegistryTableName: string,
  pk: string,
  sourceSurface: SafetySourceSurface,
  sourceSessionId: string,
  currentMessage: string,
  recentConversation: string
): Promise<SafetyClassification> {
  const fallback: SafetyClassification = {
    safetyState: 'normal',
    confidence: 0,
    reasonCodes: ['classification_unavailable'],
    requiresHumanSupport: false,
    suspendDeepWork: false,
    localeSupportNeeded: false,
  }

  let classification: SafetyClassification
  try {
    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'safety', 'classify_safety_state')
    const result = await callPromptModel(version, { recentConversation, currentMessage })
    if (typeof result === 'string') {
      console.error('Safety classification: prompt did not return forced tool-use output.')
      classification = fallback
    } else {
      const parsed = SafetyClassificationSchema.safeParse(result)
      if (!parsed.success) {
        console.error('Safety classification: model output failed schema validation.')
        classification = fallback
      } else {
        classification = parsed.data
      }
    }
  } catch (err) {
    console.error('Safety classification call failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    classification = fallback
  }

  // `normal` is the overwhelming majority case (every ordinary turn) —
  // persisting one row per turn regardless would make SafetyEventItem a
  // near-duplicate of SessionMessageItem for no purpose. Only non-normal
  // states are written, per this schema's own doc comment.
  if (classification.safetyState !== 'normal') {
    await persistSafetyEvent(ddb, tableName, pk, sourceSurface, sourceSessionId, classification)
  }

  if (classification.safetyState === 'immediate_danger') {
    await publishImmediateDangerAlert(sourceSurface, sourceSessionId, classification)
  }

  return classification
}

// Last-resort fallback if generating the real (model-written) safety
// response itself fails — a flagged turn must never surface a broken reply
// or a generic 500. Fixed text, not a model call — deliberately generic and
// safety-leaning regardless of which of the four states triggered it
// (matches ADR 0012 decision #1's constraints), so even this failure path
// stays spec-compliant rather than silently degrading it.
const FALLBACK_SAFETY_MESSAGE =
  "I want to make sure I'm giving you the right kind of support right now. If anything feels urgent or unsafe, please " +
  'reach out to a trusted person, a mental health professional, or your local emergency services.'

const SAFETY_RESPONSE_PROMPT_NAME: Record<SafetyClassification['safetyState'], string> = {
  normal: 'respond_concern', // never actually called for 'normal' — see classifySafety's own gating
  deep_reflection: 'respond_concern', // never actually called — no caller short-circuits on this state
  overload: 'respond_overload',
  high_stakes: 'respond_high_stakes',
  safety_concern: 'respond_concern',
  immediate_danger: 'respond_danger',
}

/**
 * Generates the actual reply text for a flagged turn — `companion/message.ts`
 * calls this instead of the normal `callCompanionModel`/`runOnboardingTurn`
 * path once `classifySafety()` returns `overload`/`high_stakes`/
 * `safety_concern`/`immediate_danger` (Stage 3 widened this from the
 * original two crisis states to all four "this turn needs a different
 * reply" states — see `companion/message.ts`'s own doc comment for why
 * `overload`/`high_stakes` are Companion-only for now, not also wired into
 * Rooms). Picks the matching `safety/respond_*` prompt by state; falls back
 * to `FALLBACK_SAFETY_MESSAGE` if the model call itself fails, rather than
 * letting the request fail outright on exactly the turn where a reply
 * matters most.
 */
export async function generateSafetyResponse(
  ddb: DynamoDBDocumentClient,
  promptRegistryTableName: string,
  classification: SafetyClassification,
  currentMessage: string
): Promise<string> {
  const promptName = SAFETY_RESPONSE_PROMPT_NAME[classification.safetyState]
  try {
    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'safety', promptName)
    const result = await callPromptModel(version, {
      currentMessage,
      reasonCodes: classification.reasonCodes.join(', '),
    })
    return typeof result === 'string' && result.length > 0 ? result : FALLBACK_SAFETY_MESSAGE
  } catch (err) {
    console.error('Safety response generation failed (using fixed fallback):', err instanceof Error ? err.message : 'unknown error')
    return FALLBACK_SAFETY_MESSAGE
  }
}

async function persistSafetyEvent(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string,
  sourceSurface: SafetySourceSurface,
  sourceSessionId: string,
  classification: SafetyClassification
): Promise<void> {
  const eventId = randomUUID()
  const now = new Date()
  const item: SafetyEventItem = {
    pk,
    sk: Sk.safetyEvent(eventId),
    eventId,
    sourceSurface,
    sourceSessionId,
    safetyState: classification.safetyState,
    confidence: classification.confidence,
    reasonCodes: classification.reasonCodes,
    requiresHumanSupport: classification.requiresHumanSupport,
    suspendDeepWork: classification.suspendDeepWork,
    createdAt: now.toISOString(),
    ttl: Math.floor(now.getTime() / 1000) + SAFETY_EVENT_TTL_SECONDS,
  }
  try {
    await ddb.send(new PutCommand({ TableName: tableName, Item: item }))
  } catch (err) {
    // A failed audit write must never take down the turn itself — the
    // classification result has already been decided and acted on by the
    // time this runs; losing the audit row is a real gap (log it loudly)
    // but not a reason to fail the user's request.
    console.error('Failed to persist SafetyEventItem (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}

/**
 * ADR 0012 decision #3: a live alert on `immediate_danger` specifically
 * (not `safety_concern`) — during founder-only internal testing, there is
 * no other backstop. `SAFETY_ALERT_TOPIC_ARN` is optional at the code level
 * (skips publishing with a warning if unset) so this file doesn't hard-fail
 * in an environment that hasn't wired the topic yet, but `api-stack.ts`
 * must set it on every Lambda that calls this function for the alert to
 * actually fire in a real deploy.
 */
async function publishImmediateDangerAlert(
  sourceSurface: SafetySourceSurface,
  sourceSessionId: string,
  classification: SafetyClassification
): Promise<void> {
  const topicArn = process.env.SAFETY_ALERT_TOPIC_ARN
  if (!topicArn) {
    console.error('immediate_danger detected but SAFETY_ALERT_TOPIC_ARN is not set — no alert sent.')
    return
  }
  try {
    await sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: 'DPNR safety alert: immediate_danger detected',
        // Deliberately no user content in the alert body — same "no raw
        // payloads in logs" guardrail applied here. The alert exists so a
        // human knows to go look, via the SafetyEventItem/session, not to
        // relay personal content through a third channel (email/SNS).
        Message: [
          `An immediate_danger safety classification fired on ${sourceSurface}.`,
          `Session: ${sourceSessionId}`,
          `Confidence: ${classification.confidence}`,
          `Reason codes: ${classification.reasonCodes.join(', ')}`,
          'No message content is included in this alert — review the session directly.',
        ].join('\n'),
      })
    )
  } catch (err) {
    console.error('Failed to publish immediate_danger SNS alert (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
