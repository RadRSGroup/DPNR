import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type DecisionTagItem, type DecisionProjectionItem, type DecisionOutcomeItem, type DecisionEmotionItem, type TagType } from '@dpnr/shared-types'
import { stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from './db'
import { getDecision, getOption, type DecisionContent, type OptionContent } from './helpers'

export interface GatheredDecisionContext {
  title: string
  narrative: string
  optionAContent: string
  optionBContent: string
  tagsA: Record<TagType, string[]>
  tagsB: Record<TagType, string[]>
  emotionColor: string | null
  emotionBodyLocation: string | null
  emotionReflection: string | null
  projectionsA: string[]
  projectionsB: string[]
  chosenLean: 'A' | 'B' | 'undecided'
}

function emptyTags(): Record<TagType, string[]> {
  return { pro: [], con: [], desire: [], fear: [], value: [], need: [] }
}

/**
 * Assembles everything the 3 post-flow AI prompts (session_summary,
 * summary_insight, clarity_action) need — all three read the same
 * underlying decision data, just format different subsets of it (see each
 * step file for exactly what it uses). One gather per step invocation;
 * DynamoDB reads aren't cached across separate command calls since each is
 * a stateless Lambda invocation.
 */
export async function gatherDecisionContext(pk: string, decisionId: string): Promise<GatheredDecisionContext> {
  const [decision, optionA, optionB, tagsResult, projectionsResult, emotionResult, outcomesResult] = await Promise.all([
    getDecision(pk, decisionId),
    getOption(pk, decisionId, 'A'),
    getOption(pk, decisionId, 'B'),
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
    ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionEmotion(decisionId) } })),
    ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#OUTCOME#` },
        ScanIndexForward: false, // most recent first
        Limit: 1,
      })
    ),
  ])

  const content = stubDecryptField<DecisionContent>(decision.content)
  const optionAContent = stubDecryptField<OptionContent>(optionA.content).content
  const optionBContent = stubDecryptField<OptionContent>(optionB.content).content

  const tagsA = emptyTags()
  const tagsB = emptyTags()
  for (const t of (tagsResult.Items ?? []) as DecisionTagItem[]) {
    const bucket = t.optionLabel === 'A' ? tagsA : t.optionLabel === 'B' ? tagsB : null
    if (bucket) bucket[t.tagType].push(stubDecryptField<{ label: string }>(t.content).label)
  }

  const projectionItems = (projectionsResult.Items ?? []) as DecisionProjectionItem[]
  const projectionsA = projectionItems
    .filter((p) => p.optionLabel === 'A')
    .map((p) => stubDecryptField<{ statement: string }>(p.content).statement)
  const projectionsB = projectionItems
    .filter((p) => p.optionLabel === 'B')
    .map((p) => stubDecryptField<{ statement: string }>(p.content).statement)

  const emotionItem = emotionResult.Item as DecisionEmotionItem | undefined
  const emotionContent = emotionItem
    ? stubDecryptField<{ bodyLocation: string | null; emotionColor: string | null; aiReflection: string | null }>(
        emotionItem.content
      )
    : null

  const latestOutcome = ((outcomesResult.Items ?? [])[0] as DecisionOutcomeItem | undefined)?.chosenOptionLabel ?? null

  return {
    title: content.title,
    narrative: content.narrative,
    optionAContent,
    optionBContent,
    tagsA,
    tagsB,
    emotionColor: emotionContent?.emotionColor ?? null,
    emotionBodyLocation: emotionContent?.bodyLocation ?? null,
    emotionReflection: emotionContent?.aiReflection ?? null,
    projectionsA,
    projectionsB,
    chosenLean: latestOutcome ?? 'undecided',
  }
}
