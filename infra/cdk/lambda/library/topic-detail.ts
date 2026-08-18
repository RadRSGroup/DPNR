import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  userPk,
  type LibraryTopicAliasItem,
  type LibraryTopicVersionItem,
  type TwinSignalItem,
  type LibraryTopicDetailResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { resolvePromptVersion, promptRef } from '../lib/prompt-registry'
import { callPromptModelStub } from '../lib/model-call-stub'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const CATALOG_TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string
const APPLICATION_TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string
const PROMPT_REGISTRY_TABLE_NAME = process.env.PROMPT_REGISTRY_TABLE_NAME as string

/**
 * GET /v1/library/topics/{slug} — authored content (public catalog, no
 * ownership check needed for that part) plus a personalized explanation
 * layer scoped to the caller's own confirmed Digital Twin signals (spec:
 * "not from unsupported assumptions", MVP_ARCHITECTURE.md §5.5) — that
 * part IS ownership-checked the normal structural way (`userPk(requireUserId(event))`).
 *
 * The prompt is given the actual confirmed signals' decrypted descriptions
 * (up to 5 most recent, per `library/topic_explanation`'s documented
 * convention — infra/cdk/scripts/library-prompts.seed.ts), not just a
 * count — a count alone gives a model nothing to genuinely personalize
 * with, which would make "personalized" a lie in practice even though the
 * response shape looked right. Fixed this session, once the `library`
 * domain's prompt (and its expected variable shape) existed to fix it
 * against.
 *
 * Personalization is still best-effort: if there are no confirmed
 * signals, or the `library` Prompt Registry domain doesn't exist/isn't
 * seeded yet, this degrades to `personalizedExplanation: null` rather
 * than failing the whole read.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const slug = event.pathParameters?.slug
    if (!slug) {
      throw new HttpError(400, 'missing_slug', 'Path must include a topic slug.')
    }

    const catalogPk = GlobalKeys.libraryTopicPk(slug)
    const aliasResult = await ddb.send(
      new GetCommand({ TableName: CATALOG_TABLE_NAME, Key: { pk: catalogPk, sk: GlobalKeys.promptAlias('prod') } })
    )
    const aliasItem = aliasResult.Item as LibraryTopicAliasItem | undefined
    if (!aliasItem) {
      throw new HttpError(404, 'topic_not_found', `No topic "${slug}".`)
    }

    const versionResult = await ddb.send(
      new GetCommand({
        TableName: CATALOG_TABLE_NAME,
        Key: { pk: catalogPk, sk: GlobalKeys.promptVersion(aliasItem.version) },
      })
    )
    const versionItem = versionResult.Item as LibraryTopicVersionItem | undefined
    if (!versionItem || versionItem.status !== 'active') {
      throw new HttpError(404, 'topic_not_found', `No topic "${slug}".`)
    }

    let personalizedExplanation: string | null = null
    let usedPromptRef: string | undefined

    const signalsResult = await ddb.send(
      new QueryCommand({
        TableName: APPLICATION_TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'TWIN#SIGNAL#' },
      })
    )
    const confirmedSignals = ((signalsResult.Items ?? []) as TwinSignalItem[])
      .filter((s) => s.status === 'confirmed')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)

    if (confirmedSignals.length > 0) {
      try {
        const version = await resolvePromptVersion(ddb, PROMPT_REGISTRY_TABLE_NAME, 'library', 'topic_explanation')
        const confirmedSignalsList = confirmedSignals
          .map((s) => `- (${s.domain}) ${stubDecryptField<{ description: string }>(s.content).description}`)
          .join('\n')
        const stub = await callPromptModelStub(version, {
          topicTitle: versionItem.title,
          topicBodyExcerpt: versionItem.body.slice(0, 500),
          confirmedSignals: confirmedSignalsList,
        })
        personalizedExplanation = typeof stub === 'string' ? stub : JSON.stringify(stub)
        usedPromptRef = promptRef('library', 'topic_explanation', version)
      } catch (err) {
        if (!(err instanceof HttpError && err.code === 'prompt_not_found')) {
          throw err
        }
        // No `library` domain in the Prompt Registry yet — personalization
        // just stays null, this isn't a failure of the topic read itself.
      }
    }

    const body: LibraryTopicDetailResponse = {
      slug,
      title: versionItem.title,
      taxonomyCategory: versionItem.taxonomyCategory,
      body: versionItem.body,
      personalizedExplanation,
      promptRef: usedPromptRef,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
