import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type RoadmapItem, type RoadmapProposalItem } from '@dpnr/shared-types'
import { stubEncryptField, stubDecryptField } from './crypto-stub'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'
import { gatherContinuityContext } from '../continuity/gather-context'

type RoadmapContent = { currentFocus: string; theme: string; direction: string; suggestedSpaces: string[] }

/**
 * Unconfirmed placeholder, same status as CONTINUATION_GAP_HOURS/
 * MAX_ONBOARDING_USER_TURNS — flag for product review, not treated as
 * final. A single freshly-confirmed signal is trivially "new evidence" but
 * not by itself a reasonable bar for bothering the model; this is a cheap
 * pre-filter, not the actual revision judgment (the model itself decides
 * `shouldRevise` from the full confirmed-evidence picture below).
 */
const MIN_CONFIRMED_SIGNALS_TO_CONSIDER = 2

/**
 * Called from twin/confirm.ts right after a signal moves candidate→confirmed
 * — the user's own direct choice of trigger point (docs/AGENT_LOG.md
 * Session 16), matching spec §5's "update... only when evidence justifies
 * it." Deliberately propose-first, not silent-write — also the user's own
 * direct choice, mirroring Twin's own confirm/reject trust framing rather
 * than Roadmap's write-once-at-onboarding precedent. Writes a
 * RoadmapProposalItem for the person to accept/reject
 * (POST /v1/roadmap/proposal/accept|reject) rather than touching the live
 * Roadmap directly.
 *
 * Never throws — same best-effort convention as
 * rooms/twin-signals.ts's extractCandidateSignals/persistSessionSummary. A
 * revision check failing must never block the confirm action itself.
 */
export async function maybeProposeRoadmapRevision(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  promptRegistryTableName: string,
  userId: string
): Promise<void> {
  try {
    const pk = userPk(userId)

    const [roadmapResult, existingProposalResult] = await Promise.all([
      ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.roadmap() } })),
      ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.roadmapProposal() } })),
    ])
    const roadmapItem = roadmapResult.Item as RoadmapItem | undefined
    if (!roadmapItem) return // nothing to revise yet — onboarding hasn't produced a Roadmap
    if (existingProposalResult.Item) return // don't stack a second proposal on one the person hasn't answered yet

    const { confirmedSignals } = await gatherContinuityContext(userId)
    if (confirmedSignals.length < MIN_CONFIRMED_SIGNALS_TO_CONSIDER) return

    const roadmap = stubDecryptField<RoadmapContent>(roadmapItem.content)
    const confirmedSignalsText = confirmedSignals.map((s) => `- (${s.domain}) ${s.description}`).join('\n')

    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'roadmap', 'revise')
    const result = await callPromptModel(version, {
      currentFocus: roadmap.currentFocus,
      theme: roadmap.theme,
      direction: roadmap.direction,
      confirmedSignals: confirmedSignalsText,
    })
    if (typeof result === 'string' || result.shouldRevise !== true) return

    // Never trust the model's own "shouldRevise" flag as license to skip
    // validating what it actually produced — same rule
    // companion/message.ts's persistInitialRoadmap applies to readyForRoadmap.
    const currentFocus = typeof result.currentFocus === 'string' ? result.currentFocus : ''
    const theme = typeof result.theme === 'string' ? result.theme : ''
    const direction = typeof result.direction === 'string' ? result.direction : ''
    const rationale = typeof result.rationale === 'string' ? result.rationale : ''
    if (!currentFocus || !theme || !direction || !rationale) return

    const suggestedSpaces = Array.isArray(result.suggestedSpaces)
      ? result.suggestedSpaces.filter((s): s is string => typeof s === 'string')
      : []

    const proposal: RoadmapProposalItem = {
      pk,
      sk: Sk.roadmapProposal(),
      content: stubEncryptField<RoadmapContent & { rationale: string }>({
        currentFocus,
        theme,
        direction,
        suggestedSpaces,
        rationale,
      }),
      createdAt: new Date().toISOString(),
    }
    await ddb.send(new PutCommand({ TableName: tableName, Item: proposal }))
  } catch (err) {
    // Never let a revision check fail the confirm action. Log only a
    // generic message — never model output or signal content, per the "no
    // raw payloads in logs" guardrail.
    console.error('Roadmap revision check failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
  }
}
