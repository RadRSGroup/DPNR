import type { PromptVersionItem } from '@dpnr/shared-types'
import { fillTemplate } from './prompt-registry'

/**
 * TEMPORARY stand-in for the real Bedrock Converse call — no AWS
 * account/Bedrock access exists yet (docs/AGENT_LOG.md). This is the
 * generic counterpart to companion/model-stub.ts: any caller that has
 * already resolved a PromptVersionItem (via lib/prompt-registry.ts) and
 * has real substitution values can use this, rather than each feature
 * (Rooms, eventually Library's personalization) inventing its own stub.
 *
 * It DOES fill both templates for real — that proves the resolve+fill half
 * of "Prompt Registry Lambda logic" works end to end — but returns a
 * placeholder instead of a real model response. Per ADR 0005, once Bedrock
 * is reachable this swaps for: forced tool-use when `outputSchema` is set
 * (reading the result from the tool_use block's `input`), plain text
 * otherwise. Every caller already expects that same `Record<string,
 * unknown> | string` shape, so no caller changes when this is swapped.
 */
export async function callPromptModelStub(
  promptVersion: PromptVersionItem,
  vars: Record<string, string>
): Promise<Record<string, unknown> | string> {
  fillTemplate(promptVersion.systemTemplate, vars) // exercised for real, even though this stub doesn't use the result
  const filledUser = fillTemplate(promptVersion.userTemplate, vars)

  if (!promptVersion.outputSchema) {
    return `(stub model response — Bedrock not wired yet) ${filledUser.slice(0, 120)}`
  }
  return stubValueForSchema(promptVersion.outputSchema)
}

/** Placeholder values shaped like `outputSchema`'s properties — just enough to keep callers type-correct, never real content. */
function stubValueForSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const properties = (schema.properties ?? {}) as Record<string, { type?: string }>
  const result: Record<string, unknown> = {}
  for (const [key, propSchema] of Object.entries(properties)) {
    result[key] = propSchema.type === 'array' ? [] : '(stub — Bedrock not wired yet)'
  }
  return result
}
