import { randomUUID } from 'node:crypto'
import { GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type DecisionItem, type DecisionOptionItem, type DecisionTagItem, type TagType } from '@dpnr/shared-types'
import { HttpError } from '../../lib/http'
import { stubEncryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from './db'

export type DecisionContent = { title: string; subtitle: string | null; narrative: string }
export type OptionContent = { content: string }
export type TagEntry = { label: string; aiSuggested: boolean }

export async function getDecision(pk: string, decisionId: string): Promise<DecisionItem> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionRoom(decisionId) } })
  )
  const item = result.Item as DecisionItem | undefined
  if (!item) {
    throw new HttpError(404, 'decision_not_found', 'No decision exists for this session — submit NAME_DECISION first.')
  }
  return item
}

export async function getOption(pk: string, decisionId: string, label: 'A' | 'B'): Promise<DecisionOptionItem> {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.decisionOption(decisionId, label) } })
  )
  const item = result.Item as DecisionOptionItem | undefined
  if (!item) {
    throw new HttpError(404, 'option_not_found', `Option ${label} doesn't exist yet — submit MAP_OPTIONS first.`)
  }
  return item
}

/**
 * Deletes this decision's existing tags of the given types, then writes the
 * replacements — mirrors the original app's `replaceAllTagsForOption`
 * (apps/web/src/lib/supabase/decisions.ts), scoped by `types` so a
 * DEEP_EXPLORATION resubmit never touches VALUES_NEEDS's tags on the same
 * decision (and vice versa) even though both live under the same
 * `ROOM#DECISION#<id>#TAG#*` sort-key prefix.
 */
export async function replaceTagsOfTypes(
  pk: string,
  decisionId: string,
  types: TagType[],
  newTags: { optionLabel: 'A' | 'B'; tagType: TagType; label: string; aiSuggested: boolean }[]
): Promise<void> {
  const existing = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': pk, ':prefix': `ROOM#DECISION#${decisionId}#TAG#` },
    })
  )
  const toDelete = ((existing.Items ?? []) as DecisionTagItem[]).filter((t) => types.includes(t.tagType))
  await Promise.all(
    toDelete.map((t) => ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { pk: t.pk, sk: t.sk } })))
  )

  const now = new Date().toISOString()
  await Promise.all(
    newTags.map((t) => {
      const item: DecisionTagItem = {
        pk,
        sk: Sk.decisionTag(decisionId, randomUUID()),
        optionLabel: t.optionLabel,
        tagType: t.tagType,
        aiSuggested: t.aiSuggested,
        content: stubEncryptField({ label: t.label }),
        createdAt: now,
      }
      return ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
    })
  )
}
