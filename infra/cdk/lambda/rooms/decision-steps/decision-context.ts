import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type DecisionTagItem, type DecisionProjectionItem, type DecisionOutcomeItem, type DecisionEmotionItem, type TagType } from '@dpnr/shared-types'
import type { SessionCrypto } from '../../lib/session-crypto'
import { ddb, TABLE_NAME } from './db'
import { getDecision, getOption, findOption, type DecisionContent, type OptionContent } from './helpers'
import type { DecisionEmotionContent } from './body-emotion'
import { formatEmotion, formatBody } from '../felt'

export interface GatheredDecisionContext {
  title: string
  narrative: string
  optionAContent: string
  optionBContent: string
  /** Only decisions with a third option (2026-09-28 #2) have one. */
  optionCContent: string | null
  tagsA: Record<TagType, string[]>
  tagsB: Record<TagType, string[]>
  tagsC: Record<TagType, string[]>
  emotionColor: string | null
  emotionBodyLocation: string | null
  emotionReflection: string | null
  projectionsA: string[]
  projectionsB: string[]
  projectionsC: string[]
  chosenLean: 'A' | 'B' | 'C' | 'undecided'
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
export async function gatherDecisionContext(
  crypto: SessionCrypto,
  pk: string,
  decisionId: string
): Promise<GatheredDecisionContext> {
  const [decision, optionA, optionB, optionC, tagsResult, projectionsResult, emotionResult, outcomesResult] = await Promise.all([
    getDecision(pk, decisionId),
    getOption(pk, decisionId, 'A'),
    getOption(pk, decisionId, 'B'),
    findOption(pk, decisionId, 'C'),
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

  const content = await crypto.decryptField<DecisionContent>(decision.content)
  const optionAContent = (await crypto.decryptField<OptionContent>(optionA.content)).content
  const optionBContent = (await crypto.decryptField<OptionContent>(optionB.content)).content
  const optionCContent = optionC ? (await crypto.decryptField<OptionContent>(optionC.content)).content : null

  const tagsA = emptyTags()
  const tagsB = emptyTags()
  const tagsC = emptyTags()
  for (const t of (tagsResult.Items ?? []) as DecisionTagItem[]) {
    const bucket = t.optionLabel === 'A' ? tagsA : t.optionLabel === 'B' ? tagsB : t.optionLabel === 'C' && optionC ? tagsC : null
    if (bucket) bucket[t.tagType].push((await crypto.decryptField<{ label: string }>(t.content)).label)
  }

  const projectionItems = (projectionsResult.Items ?? []) as DecisionProjectionItem[]
  const statementsFor = (label: 'A' | 'B' | 'C') =>
    Promise.all(
      projectionItems
        .filter((p) => p.optionLabel === label)
        .map(async (p) => (await crypto.decryptField<{ statement: string }>(p.content)).statement)
    )
  const [projectionsA, projectionsB, projectionsC] = await Promise.all([
    statementsFor('A'),
    statementsFor('B'),
    optionC ? statementsFor('C') : Promise.resolve([]),
  ])

  const emotionItem = emotionResult.Item as DecisionEmotionItem | undefined
  const emotionContent = emotionItem ? await crypto.decryptField<DecisionEmotionContent>(emotionItem.content) : null
  // Slice 5b: when the chips/body map were used, the prompts get the full
  // formatted picture (every emotion, where the person placed each); older
  // decisions only have the single legacy values.
  const structured = !!emotionContent?.emotionsFelt?.length

  const latestOutcome = ((outcomesResult.Items ?? [])[0] as DecisionOutcomeItem | undefined)?.chosenOptionLabel ?? null

  return {
    title: content.title,
    narrative: content.narrative,
    optionAContent,
    optionBContent,
    optionCContent,
    tagsA,
    tagsB,
    tagsC,
    emotionColor: emotionContent
      ? structured
        ? formatEmotion({ emotion: emotionContent.emotionWords ?? '', emotionsFelt: emotionContent.emotionsFelt })
        : emotionContent.emotionColor
      : null,
    emotionBodyLocation: emotionContent
      ? structured
        ? formatBody({ bodyResponse: emotionContent.bodyWords ?? '', bodyPlacements: emotionContent.bodyPlacements })
        : emotionContent.bodyLocation
      : null,
    emotionReflection: emotionContent?.aiReflection ?? null,
    projectionsA,
    projectionsB,
    projectionsC,
    chosenLean: latestOutcome ?? 'undecided',
  }
}

/*
 * Option C in the prompts (2026-09-28 #2). Templates have no conditionals
 * (decision-room-prompts.seed.ts), so each of these is either the whole
 * extra text for Option C or '' for a two-option decision. Every caller
 * always sends them; an older template that doesn't use them ignores them.
 */

/** ` | Option C: "…"` after `Option A: "…" | Option B: "…"` (session_summary, clarity_action). */
export function optionCInline(context: GatheredDecisionContext): string {
  return context.optionCContent === null ? '' : ` | Option C: "${context.optionCContent}"`
}

/** A new line `Option C: "…"` after Option B's line (summary_insight). */
export function optionCLine(context: GatheredDecisionContext): string {
  return context.optionCContent === null ? '' : `\nOption C: "${context.optionCContent}"`
}

/** Option C's own lines, after Option B's selections (section_summary). */
export function optionCBlock(context: GatheredDecisionContext, selectionsC: string): string {
  return context.optionCContent === null ? '' : `\nOption C: "${context.optionCContent}"\nOption C selections: ${selectionsC}`
}

/** Option C's tags and projections, after `Projections B` (session_summary). */
export function optionCDetails(context: GatheredDecisionContext): string {
  if (context.optionCContent === null) return ''
  const join = (arr: string[]) => arr.join(', ') || '—'
  const t = context.tagsC
  return [
    '',
    `Pros C: ${join(t.pro)} | Cons C: ${join(t.con)}`,
    `Desires C: ${join(t.desire)} | Fears C: ${join(t.fear)}`,
    `Values C: ${join(t.value)} | Needs C: ${join(t.need)}`,
    `Projections C: ${join(context.projectionsC)}`,
  ].join('\n')
}
