import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  type RoadmapItem,
  type CreditsBalanceItem,
  type DashboardResponse,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

// Beta Trial/Credits ledger (MVP_ARCHITECTURE.md §5.6) isn't built yet — no
// flow grants a CREDITS item to anyone. Used only when that item is absent,
// so a user with no ledger entry yet reads as "0, low" rather than crashing.
const DEFAULT_LOW_BALANCE_THRESHOLD = 5

type RoadmapContent = {
  currentFocus: string
  theme: string
  direction: string
  suggestedSpaces: string[]
}

/**
 * GET /v1/dashboard — aggregate read (MVP_ARCHITECTURE.md §4). Read-only
 * over the caller's own data; no consent gate (see lib/consent.ts's doc
 * comment on why reads are excluded).
 *
 * Ownership is structural, not a separate runtime check: every key below
 * is built from `userPk(requireUserId(event))` — the caller's own JWT
 * `sub` — never a client-supplied id, so there is no cross-user access
 * path to guard against here.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)

    const [roadmapResult, creditsResult] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmap() } })),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.credits() } })),
    ])

    const roadmapItem = roadmapResult.Item as RoadmapItem | undefined
    const roadmap = roadmapItem ? stubDecryptField<RoadmapContent>(roadmapItem.content) : null

    const creditsItem = creditsResult.Item as CreditsBalanceItem | undefined
    const creditsBalance = creditsItem?.balance ?? 0
    const lowBalanceThreshold = creditsItem?.lowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
    const creditsLow = creditsBalance <= lowBalanceThreshold

    // Daily Card / commitments (MVP_ARCHITECTURE.md §5.7/§6) don't exist yet
    // — the only continuity cue derivable from what's actually stored today
    // is nudging toward the first roadmap-suggested space. Revisit once
    // that pipeline is real; don't invent richer logic against data that
    // isn't there.
    const continuityCue =
      roadmap && roadmap.suggestedSpaces.length > 0
        ? { kind: 'recommended_space' as const, text: `Consider exploring: ${roadmap.suggestedSpaces[0]}` }
        : null

    const body: DashboardResponse = {
      roadmap,
      continuityCue,
      creditsBalance,
      creditsLow,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
