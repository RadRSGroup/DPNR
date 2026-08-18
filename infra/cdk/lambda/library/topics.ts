import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import {
  GlobalKeys,
  type LibraryTopicAliasItem,
  type LibraryTopicVersionItem,
  type LibraryTopicsResponse,
} from '@dpnr/shared-types'
import { jsonResponse, errorResponse } from '../lib/http'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string

/**
 * GET /v1/library/topics — public catalog listing. Unlike every other
 * handler so far, this reads a shared config table, not a user's own
 * partition, so there's no ownership check (no `requireUserId` call) —
 * still requires a valid JWT to reach this Lambda at all (route-level
 * authorizer), just nothing user-scoped inside it.
 *
 * Uses a Scan, not a Query, deliberately: this catalog is config-like
 * (authored by the DPNR team, versioned, low write volume — same profile
 * as the Prompt Registry, see data-stack.ts's comment on this table), not
 * a per-user hot path. A full scan is the right trade here, same
 * reasoning this repo already uses for not adding a GSI until a concrete
 * need justifies one. Revisit only if this table grows into hundreds+ of
 * topics — it won't for a long time (spec §10: "not hundreds of
 * hand-authored Library items" for MVP).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async () => {
  try {
    const scanResult = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'sk = :prodAlias',
        ExpressionAttributeValues: { ':prodAlias': GlobalKeys.promptAlias('prod') },
      })
    )
    const aliasItems = (scanResult.Items ?? []) as LibraryTopicAliasItem[]

    const versionResults = await Promise.all(
      aliasItems.map((alias) =>
        ddb.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { pk: alias.pk, sk: GlobalKeys.promptVersion(alias.version) },
          })
        )
      )
    )

    const topics = versionResults
      .map((r) => r.Item as LibraryTopicVersionItem | undefined)
      .filter((item): item is LibraryTopicVersionItem => item !== undefined && item.status === 'active')
      .map((item) => ({
        slug: item.pk.replace('LIBRARY#TOPIC#', ''),
        title: item.title,
        taxonomyCategory: item.taxonomyCategory,
      }))

    const body: LibraryTopicsResponse = { topics }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
