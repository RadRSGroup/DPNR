import type { CompanionDirective } from '@dpnr/shared-types'

export interface CompanionTurn {
  role: 'user' | 'assistant'
  text: string
}

export interface CompanionModelResult {
  reply: string
  directive: CompanionDirective | null
}

/**
 * TEMPORARY stand-in for the real Companion model call (MVP_ARCHITECTURE.md
 * §5.1: a Bedrock Converse loop with a small tool-routing layer for
 * navigation directives). Blocked on two things that don't exist yet,
 * independent of this handler's own plumbing:
 *   1. An AWS account / Bedrock access at all (docs/AGENT_LOG.md) — there
 *      is nothing to call.
 *   2. A `companion` domain in the Prompt Registry. Only `decision_room`
 *      prompts have been ported/designed so far (MVP_ARCHITECTURE.md §3.2
 *      lists `companion` as a planned domain, not a built one). Writing a
 *      full Companion system prompt/personality here would be inventing
 *      product content this session has no source-of-truth for — that's
 *      product-content work, not infra wiring, so this stays a named,
 *      obvious stub instead of a plausible-looking fake.
 *
 * Swap this function's body for a real Bedrock Converse call once both
 * blockers clear. `directive` is exactly the kind of structured output
 * ADR 0005's forced-tool-use pattern is for — reuse it here rather than a
 * fresh "return ONLY valid JSON" instruction. Every caller of this
 * function already has the right shape to keep working unchanged.
 */
export async function callCompanionModel(
  _history: CompanionTurn[],
  userText: string
): Promise<CompanionModelResult> {
  return {
    reply: `(stub reply — Companion model not wired yet) I heard: "${userText.slice(0, 120)}"`,
    directive: null,
  }
}
