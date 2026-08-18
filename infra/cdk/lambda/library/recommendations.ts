import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import type { LibraryRecommendationsResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'

/**
 * GET /v1/library/recommendations. Deliberately returns an empty list for
 * now rather than a fabricated ranking: there is no authored mapping from
 * a Digital Twin signal's `domain` to a Library topic's `taxonomyCategory`
 * anywhere in this codebase, and no `library` Prompt Registry domain to
 * ask a model to rank topics either (see topic-detail.ts's same caveat).
 * A "top N topics regardless of relevance" response would look real
 * without being real — worse than an honest empty list, per this
 * project's "no half-finished implementations" standard. Build this for
 * real once one of those two things exists.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    requireUserId(event) // still enforced — this is a per-user endpoint even with nothing to compute yet
    const body: LibraryRecommendationsResponse = { recommendations: [] }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
