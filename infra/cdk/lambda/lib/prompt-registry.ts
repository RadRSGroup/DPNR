import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { GlobalKeys, type PromptVersionItem, type PromptAliasItem } from '@dpnr/shared-types'
import { HttpError } from './http'

/**
 * The "resolve {domain}/{name} + alias → template" half of the Prompt
 * Registry Lambda logic every session since Session 3 deferred (see
 * docs/AGENT_LOG.md). This part is real and fully testable once
 * `Dpnr-Data` is deployed and seeded — only the model call on the other
 * side of it (lib/model-call-stub.ts) is stubbed, for reasons that have
 * nothing to do with this resolution logic (no Bedrock access yet).
 */
export async function resolvePromptVersion(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  domain: string,
  name: string,
  alias = 'prod'
): Promise<PromptVersionItem> {
  const pk = GlobalKeys.promptRegistryPk(domain, name)

  const aliasResult = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { pk, sk: GlobalKeys.promptAlias(alias) } })
  )
  const aliasItem = aliasResult.Item as PromptAliasItem | undefined
  if (!aliasItem) {
    throw new HttpError(500, 'prompt_not_found', `No '${alias}' alias registered for ${domain}/${name}.`)
  }

  const versionResult = await ddb.send(
    new GetCommand({ TableName: tableName, Key: { pk, sk: GlobalKeys.promptVersion(aliasItem.version) } })
  )
  const versionItem = versionResult.Item as PromptVersionItem | undefined
  if (!versionItem) {
    throw new HttpError(
      500,
      'prompt_not_found',
      `${domain}/${name}'s '${alias}' alias points at version ${aliasItem.version}, which doesn't exist.`
    )
  }
  return versionItem
}

/** `{{key}}` substitution — the convention established in decision-room-prompts.seed.ts. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      throw new HttpError(500, 'prompt_template_error', `Prompt template references undefined variable "${key}".`)
    }
    return vars[key]
  })
}

/** e.g. "decision_room/parse_options@v1" — stored on result items per the `promptRef` convention (MVP_ARCHITECTURE.md §5.2). */
export function promptRef(domain: string, name: string, version: PromptVersionItem): string {
  // version.sk is Sk-shaped ("VERSION#0001") via GlobalKeys.promptVersion — parse the number back out
  // rather than threading a separate version-number parameter through every caller.
  const versionNumber = Number.parseInt(version.sk.replace('VERSION#', ''), 10)
  return `${domain}/${name}@v${versionNumber}`
}
