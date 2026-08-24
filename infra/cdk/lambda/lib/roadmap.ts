import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type RoadmapItem } from '@dpnr/shared-types'

/**
 * Whether the caller already has a Roadmap — the single signal
 * `companion/message.ts` and `companion/context.ts` both use to decide
 * whether a person is still in onboarding (spec Golden Path A step 8:
 * "Generate initial Roadmap") or already past it. Existence only, not the
 * content — callers that need the actual Roadmap already have their own
 * `GetCommand` (dashboard/handler.ts), no need to route that through here too.
 */
export async function roadmapExists(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  pk: string
): Promise<boolean> {
  const result = await ddb.send(new GetCommand({ TableName: tableName, Key: { pk, sk: Sk.roadmap() } }))
  return (result.Item as RoadmapItem | undefined) !== undefined
}
