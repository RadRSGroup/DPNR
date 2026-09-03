import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, userPk, type RoadmapItem, type RoadmapProposalItem, type RoadmapProposalAcceptResponse } from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { getSessionCrypto } from '../lib/session-crypto'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE_NAME = process.env.APPLICATION_TABLE_NAME as string

type RoadmapContent = { currentFocus: string; theme: string; direction: string; suggestedSpaces: string[] }
type RoadmapProposalContent = RoadmapContent & { rationale: string }

/**
 * POST /v1/roadmap/proposal/accept — the pending revision (lib/roadmap-
 * revision.ts) becomes the live Roadmap. The prior live content is archived
 * under `Sk.roadmapVersion(oldVersion)` first, per RoadmapItem's own
 * `version` field (Session 16) — real history, not a silent overwrite.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const crypto = await getSessionCrypto(userId)

    const [roadmapResult, proposalResult] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmap() } })),
      ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmapProposal() } })),
    ])
    const roadmapItem = roadmapResult.Item as RoadmapItem | undefined
    const proposalItem = proposalResult.Item as RoadmapProposalItem | undefined
    if (!roadmapItem || !proposalItem) {
      throw new HttpError(404, 'no_pending_proposal', 'There is no pending Roadmap revision to accept.')
    }

    const proposal = await crypto.decryptField<RoadmapProposalContent>(proposalItem.content)
    const now = new Date().toISOString()
    const newVersion = roadmapItem.version + 1
    const newContent = await crypto.encryptField<RoadmapContent>({
      currentFocus: proposal.currentFocus,
      theme: proposal.theme,
      direction: proposal.direction,
      suggestedSpaces: proposal.suggestedSpaces,
    })

    await Promise.all([
      // Archive the outgoing content under its own version number — real
      // history (RoadmapItem's `version` field), not a silent overwrite.
      ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: { pk, sk: Sk.roadmapVersion(roadmapItem.version), content: roadmapItem.content, updatedAt: roadmapItem.updatedAt },
        })
      ),
      ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            pk,
            sk: Sk.roadmap(),
            content: newContent,
            version: newVersion,
            // Intelligence Spec §17 — accepting a revision resolves the
            // 'evolving' state roadmap-revision.ts set when it proposed this;
            // 'active' either way, whether this is the very first accept or
            // a later one.
            lifecycleState: 'active',
            updatedAt: now,
          } satisfies RoadmapItem,
        })
      ),
      ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.roadmapProposal() } })),
    ])

    const response: RoadmapProposalAcceptResponse = {
      currentFocus: proposal.currentFocus,
      theme: proposal.theme,
      direction: proposal.direction,
      suggestedSpaces: proposal.suggestedSpaces,
      lifecycleState: 'active',
    }
    return jsonResponse(200, response)
  } catch (err) {
    return errorResponse(err)
  }
}
