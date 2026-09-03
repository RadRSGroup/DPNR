import { InteractionModeSchema, type InteractionMode } from '@dpnr/shared-types'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { resolvePromptVersion } from './prompt-registry'
import { callPromptModel } from './model-call'

/**
 * Intelligence Spec §17 "Current Interaction Mode" — structurally identical
 * to lib/safety.ts's classifySafety(): a small, own-context-window Bedrock
 * classification call, run on every Companion turn, that never throws and
 * degrades to a safe fallback ('unknown') on any failure — a classification
 * hiccup must never block a chat turn. Unlike classifySafety, there is no
 * persisted audit item (SafetyEventItem's equivalent) — this is genuinely
 * temporary, per-turn state (the spec's own framing, "not an identity
 * trait"), so message.ts just writes the latest value onto
 * CompanionActiveSessionPointerItem and moves on.
 */
export async function classifyInteractionMode(
  ddb: DynamoDBDocumentClient,
  promptRegistryTableName: string,
  currentMessage: string,
  recentConversation: string
): Promise<InteractionMode> {
  try {
    const version = await resolvePromptVersion(ddb, promptRegistryTableName, 'companion', 'classify_interaction_mode')
    const result = await callPromptModel(version, { currentMessage, recentConversation })
    if (typeof result === 'string') {
      console.error('Interaction mode classification: prompt did not return forced tool-use output.')
      return 'unknown'
    }
    const parsed = InteractionModeSchema.safeParse(result.mode)
    return parsed.success ? parsed.data : 'unknown'
  } catch (err) {
    console.error('Interaction mode classification failed (non-fatal):', err instanceof Error ? err.message : 'unknown error')
    return 'unknown'
  }
}
