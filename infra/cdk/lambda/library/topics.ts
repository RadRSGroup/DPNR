import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { LibraryTopicsResponse } from '@dpnr/shared-types'
import { jsonResponse, errorResponse } from '../lib/http'
import { listActiveTopics } from '../lib/library-catalog'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.LIBRARY_CATALOG_TABLE_NAME as string

/**
 * GET /v1/library/topics — public catalog listing. Unlike every other
 * handler so far, this reads a shared config table, not a user's own
 * partition, so there's no ownership check (no `requireUserId` call) —
 * still requires a valid JWT to reach this Lambda at all (route-level
 * authorizer), just nothing user-scoped inside it.
 *
 * Uses a Scan, not a Query, deliberately (see lib/library-catalog.ts): this
 * catalog is config-like (authored by the DPNR team, versioned, low write
 * volume — same profile as the Prompt Registry, see data-stack.ts's comment
 * on this table), not a per-user hot path. Revisit only if this table grows
 * into hundreds+ of topics — it won't for a long time (spec §10: "not
 * hundreds of hand-authored Library items" for MVP).
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async () => {
  try {
    const topics = await listActiveTopics(ddb, TABLE_NAME)
    const body: LibraryTopicsResponse = { topics }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
