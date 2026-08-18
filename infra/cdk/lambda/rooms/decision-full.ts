import type { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda'
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import {
  Sk,
  userPk,
  type DecisionItem,
  type DecisionOptionItem,
  type DecisionTagItem,
  type DecisionProjectionItem,
  type DecisionOutcomeItem,
  type DecisionSummaryItem,
  type DecisionEmotionItem,
  type DecisionEmotionAgreement,
  type DecisionRoomFullResponse,
  type DecisionRoomOptionView,
  type DecisionRoomTagView,
  type DecisionRoomProjectionView,
} from '@dpnr/shared-types'
import { requireUserId, jsonResponse, errorResponse, HttpError } from '../lib/http'
import { stubDecryptField } from '../lib/crypto-stub'
import { ddb, TABLE_NAME } from './decision-steps/db'

type DecisionContent = { title: string; subtitle: string | null; narrative: string }
type OptionContent = { content: string }
type TagContent = { label: string }
type ProjectionContent = { statement: string }
type OutcomeContent = { reflection: string }
type SummaryContent = { summary: string }
type EmotionContent = {
  bodyLocation: string | null
  emotionColor: string | null
  aiReflection: string | null
  userResponse: DecisionEmotionAgreement | null
}

/**
 * GET /v1/rooms/decision/{id}/full. Ownership is structural like the other
 * read handlers — `id` is client-supplied but only ever selects a sort key
 * inside the caller's own partition (`userPk(requireUserId(event))`); a
 * guessed id belonging to another user simply returns nothing, since
 * DynamoDB isolates by `pk`, never by a client-controlled value elsewhere.
 *
 * Only what NAME_DECISION/MAP_OPTIONS (lambda/rooms/command.ts) actually
 * write exists today — emotion/tags/projections/outcomes/summary read back
 * as null/empty until steps 3–7 are implemented. That's an honest
 * reflection of what's stored, not a bug.
 */
export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = requireUserId(event)
    const pk = userPk(userId)
    const decisionId = event.pathParameters?.id
    if (!decisionId) {
      throw new HttpError(400, 'missing_id', 'Path must include a decision id.')
    }

    const [decisionResult, optionAResult, optionBResult, emotionResult, tagsResult, projectionsResult, outcomesResult, summaryResult] =
      await Promise.all([
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionRoom(decisionId) } })),
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionOption(decisionId, 'A') } })),
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionOption(decisionId, 'B') } })),
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionEmotion(decisionId) } })),
        ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#TAG#` },
          })
        ),
        ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#PROJECTION#` },
          })
        ),
        ddb.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
            ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#OUTCOME#` },
          })
        ),
        ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionSummary(decisionId) } })),
      ])

    const decisionItem = decisionResult.Item as DecisionItem | undefined
    if (!decisionItem) {
      throw new HttpError(404, 'decision_not_found', 'No decision found for this id.')
    }
    const content = stubDecryptField<DecisionContent>(decisionItem.content)

    const tagItems = (tagsResult.Items ?? []) as DecisionTagItem[]
    const projectionItems = (projectionsResult.Items ?? []) as DecisionProjectionItem[]

    const buildOption = (
      item: DecisionOptionItem | undefined,
      label: 'A' | 'B'
    ): DecisionRoomOptionView | null => {
      if (!item) return null
      const optionContent = stubDecryptField<OptionContent>(item.content)
      // Current Step05 UI always attaches an explicit optionLabel per tag
      // (even for the fear/desire lens) — see docs/AGENT_LOG.md. The schema
      // leaves optionLabel optional for a genuinely option-agnostic tag,
      // but none exist to filter in today, so this only matches on label.
      const tags: DecisionRoomTagView[] = tagItems
        .filter((t) => t.optionLabel === label)
        .map((t) => ({
          tagType: t.tagType,
          aiSuggested: t.aiSuggested,
          label: stubDecryptField<TagContent>(t.content).label,
        }))
      const projections: DecisionRoomProjectionView[] = projectionItems
        .filter((p) => p.optionLabel === label)
        .map((p) => ({
          selected: p.selected,
          isCustom: p.isCustom,
          statement: stubDecryptField<ProjectionContent>(p.content).statement,
        }))
      return { label, approved: item.approved, content: optionContent.content, tags, projections }
    }

    const optionA = buildOption(optionAResult.Item as DecisionOptionItem | undefined, 'A')
    const optionB = buildOption(optionBResult.Item as DecisionOptionItem | undefined, 'B')

    const emotionItem = emotionResult.Item as DecisionEmotionItem | undefined
    const emotion = emotionItem ? stubDecryptField<EmotionContent>(emotionItem.content) : null

    const outcomeItems = (outcomesResult.Items ?? []) as DecisionOutcomeItem[]
    const outcomes = outcomeItems.map((o) => ({
      chosenOptionLabel: o.chosenOptionLabel,
      reflection: stubDecryptField<OutcomeContent>(o.content).reflection,
      createdAt: o.createdAt,
    }))

    const summaryItem = summaryResult.Item as DecisionSummaryItem | undefined
    const summary = summaryItem ? stubDecryptField<SummaryContent>(summaryItem.content).summary : null

    const body: DecisionRoomFullResponse = {
      decisionId,
      status: decisionItem.status,
      currentStep: decisionItem.currentStep,
      lens: decisionItem.lens,
      reviewDate: decisionItem.reviewDate,
      title: content.title,
      subtitle: content.subtitle,
      narrative: content.narrative || null,
      options: [optionA, optionB].filter((o): o is DecisionRoomOptionView => o !== null),
      emotion,
      outcomes,
      summary,
      createdAt: decisionItem.createdAt,
      updatedAt: decisionItem.updatedAt,
    }
    return jsonResponse(200, body)
  } catch (err) {
    return errorResponse(err)
  }
}
