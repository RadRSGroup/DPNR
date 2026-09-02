import type { PromptVersionItem } from '@dpnr/shared-types'
import { BedrockRuntimeClient, ConverseCommand, type GuardrailTraceAssessment } from '@aws-sdk/client-bedrock-runtime'
import type { DocumentType } from '@smithy/types'
import { fillTemplate } from './prompt-registry'
import { HttpError } from './http'

const bedrock = new BedrockRuntimeClient({})

/**
 * Fixed tool name for forced-tool-use structured output (ADR 0005). Never a
 * real "choice" — `toolChoice` forces the model onto this exact tool, so
 * the name itself carries no product meaning.
 */
const STRUCTURED_OUTPUT_TOOL_NAME = 'record_structured_output'

/** Reference to a deployed Bedrock Guardrail — see `callPromptModel`'s `guardrail` param. */
export interface GuardrailRef {
  identifier: string
  version: string
}

/**
 * Resolves a filled Prompt Registry entry through a real Bedrock Converse
 * call. The one shared call every domain uses (Rooms, Library, Twin
 * extraction, Continuity's composers, and now Companion) — any caller that
 * has already resolved a PromptVersionItem (via lib/prompt-registry.ts) and
 * has real substitution values can use this, rather than each feature
 * inventing its own call.
 *
 * Per ADR 0005: a non-null `outputSchema` forces a single tool call built
 * from that schema and reads the result from the tool_use block's `input`
 * — never by parsing the model's text as JSON, since Claude has no
 * equivalent to OpenAI's `response_format: json_object`. No `outputSchema`
 * calls normally and returns the text response as-is.
 *
 * `guardrail` (optional) attaches a native Bedrock Guardrail as a
 * defense-in-depth layer alongside whatever the prompt itself does (Stage 4
 * of docs/SAFETY_SYSTEM_DESIGN.md — currently only passed by lib/safety.ts's
 * two safety calls, not the other 8 domains, since that's the scope Stage 4
 * itself defines). Purely observational for now — every filter/topic in
 * `infra/cdk/lib/api-stack.ts`'s `SafetyGuardrail` is configured
 * `NONE`/detect-only, so this never blocks or alters a response; it only
 * adds `logGuardrailIntervention`'s structural (never-raw-content) CloudWatch
 * line when Guardrails independently flags something. Switching any filter
 * to `BLOCK` is a real behavior change for a later session to make
 * deliberately, once real usage data exists to calibrate against.
 */
export async function callPromptModel(
  promptVersion: PromptVersionItem,
  vars: Record<string, string>,
  guardrail?: GuardrailRef
): Promise<Record<string, unknown> | string> {
  const filledSystem = fillTemplate(promptVersion.systemTemplate, vars)
  const filledUser = fillTemplate(promptVersion.userTemplate, vars)
  const { model, temperature, maxTokens } = promptVersion.modelParams
  const { outputSchema } = promptVersion

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: model,
      system: [{ text: filledSystem }],
      messages: [{ role: 'user', content: [{ text: filledUser }] }],
      inferenceConfig: { temperature, maxTokens },
      ...(guardrail
        ? {
            guardrailConfig: {
              guardrailIdentifier: guardrail.identifier,
              guardrailVersion: guardrail.version,
              trace: 'enabled',
            },
          }
        : {}),
      ...(outputSchema
        ? {
            toolConfig: {
              tools: [
                {
                  toolSpec: {
                    name: STRUCTURED_OUTPUT_TOOL_NAME,
                    // outputSchema is a JSON-schema-shaped plain object (packages/shared-types'
                    // z.record(z.string(), z.unknown())) — always a valid DocumentType at runtime,
                    // but TS can't structurally match Record<string, unknown> against the SDK's
                    // recursive JSON-value union.
                    inputSchema: { json: outputSchema as unknown as DocumentType },
                  },
                },
              ],
              toolChoice: { tool: { name: STRUCTURED_OUTPUT_TOOL_NAME } },
            },
          }
        : {}),
    })
  )

  if (guardrail) {
    logGuardrailIntervention(promptVersion.pk, response.trace?.guardrail)
  }

  const content = response.output?.message?.content ?? []

  if (outputSchema) {
    const toolUse = content.find((block) => block.toolUse)?.toolUse
    if (!toolUse?.input) {
      throw new HttpError(502, 'model_call_failed', 'Bedrock did not return the forced tool call.')
    }
    return toolUse.input as Record<string, unknown>
  }

  const text = content
    .map((block) => block.text)
    .filter((t): t is string => typeof t === 'string')
    .join('')
  if (!text) {
    throw new HttpError(502, 'model_call_failed', 'Bedrock returned no text content.')
  }
  return text
}

/**
 * Logs a Guardrail intervention as a structured, content-free CloudWatch
 * line — the standing "no raw payloads in logs" guardrail (docs/AGENT_LOG.md)
 * applies here too, so this deliberately extracts only the structural fields
 * (filter/topic type name, confidence, action) and never
 * `GuardrailTraceAssessment.modelOutput` or any assessed input/output text.
 * A no-op when nothing was detected, so a normal (overwhelming-majority)
 * turn produces zero extra log noise.
 */
function logGuardrailIntervention(promptPk: string, trace: GuardrailTraceAssessment | undefined): void {
  if (!trace) return
  const assessments = [
    ...Object.values(trace.inputAssessment ?? {}),
    ...Object.values(trace.outputAssessments ?? {}).flat(),
  ]
  const contentFilters = assessments
    .flatMap((a) => a.contentPolicy?.filters ?? [])
    .filter((f) => f.detected)
    .map((f) => ({ type: f.type, confidence: f.confidence, action: f.action }))
  const topics = assessments
    .flatMap((a) => a.topicPolicy?.topics ?? [])
    .filter((t) => t.detected)
    .map((t) => ({ name: t.name, action: t.action }))
  if (contentFilters.length === 0 && topics.length === 0) return
  console.warn('[safety-guardrail] intervened', { promptPk, contentFilters, topics })
}
