import type { PromptVersionItem } from '@dpnr/shared-types'
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
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

/**
 * Resolves a filled Prompt Registry entry through a real Bedrock Converse
 * call. This is the generic counterpart to companion/model-stub.ts (that
 * one's still a stub — Companion has no Prompt Registry domain yet, see
 * docs/AGENT_LOG.md): any caller that has already resolved a
 * PromptVersionItem (via lib/prompt-registry.ts) and has real substitution
 * values can use this, rather than each feature (Rooms, Library) inventing
 * its own call.
 *
 * Per ADR 0005: a non-null `outputSchema` forces a single tool call built
 * from that schema and reads the result from the tool_use block's `input`
 * — never by parsing the model's text as JSON, since Claude has no
 * equivalent to OpenAI's `response_format: json_object`. No `outputSchema`
 * calls normally and returns the text response as-is.
 */
export async function callPromptModel(
  promptVersion: PromptVersionItem,
  vars: Record<string, string>
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
