import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type MirrorSessionItem, type MirrorEntry, type MirrorEmotionFelt, type MirrorBodyPlacement } from '@dpnr/shared-types'
import { HttpError } from '../../lib/http'
import { ddb, TABLE_NAME } from '../db'

/**
 * The decrypted Mirror content blob. The 11 string fields are the original
 * step-grouped answers (see dynamo/mirror-room.ts); the optional ones were
 * added in Session 72 (Slice 3) and are absent on older sessions.
 */
export type MirrorContent = {
  situation: string
  trigger: string
  thought: string
  emotion: string
  bodyResponse: string
  automaticReaction: string
  copingResponse: string
  recurringPattern: string
  energyMoodEffect: string
  lifeDomain: string
  commitment: string
  entry?: MirrorEntry
  emotionsFelt?: MirrorEmotionFelt[]
  bodyPlacements?: MirrorBodyPlacement[]
  /** Last generated SYNTHESIS text; dropped whenever an earlier answer changes (see withAnswers). */
  synthesis?: string
}

export async function getMirrorSession(pk: string, mirrorId: string): Promise<MirrorSessionItem> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.mirrorRoom(mirrorId) } }))
  const item = result.Item as MirrorSessionItem | undefined
  if (!item) {
    throw new HttpError(404, 'mirror_session_not_found', 'No Mirror Room session exists for this id — submit SITUATION first.')
  }
  return item
}

/**
 * Merges a step's answers into the content. If any answer actually changed,
 * the stored synthesis no longer describes this session and is dropped, so
 * SYNTHESIS regenerates it; an unchanged resubmit (Back → Continue) keeps it.
 */
export function withAnswers(content: MirrorContent, patch: Partial<MirrorContent>): MirrorContent {
  const changed = (Object.keys(patch) as (keyof MirrorContent)[]).some(
    (key) => JSON.stringify(patch[key] ?? null) !== JSON.stringify(content[key] ?? null)
  )
  const next: MirrorContent = { ...content, ...patch }
  if (changed) delete next.synthesis
  return next
}

/** How the person came in, for the prompts' {{entryContext}} (Appendix B). */
export function formatEntryContext(entry: MirrorEntry | undefined): string {
  if (entry?.mode === 'pattern' && (entry.patternName || entry.patternDescription)) {
    const label = entry.patternName ? `"${entry.patternName}"` : 'a pattern'
    const reading = entry.patternDescription ? ` (their own confirmed reading: "${entry.patternDescription}")` : ''
    return `They came in through a pattern they already know and confirmed: ${label}${reading}. Do not identify or name the pattern for them again; explore how it showed up in this specific moment.`
  }
  if (entry?.mode === 'archetype' && entry.archetype) {
    return `They came in through trigger archetypes and felt the ${entry.archetype} part of them took over. Use this as context; do not restart generic pattern discovery.`
  }
  return 'They came in by describing a situation. Begin from what happened and what became activated.'
}

/** Emotion for the prompts: the chips they chose plus their own words, whichever exist. */
export function formatEmotion(content: Pick<MirrorContent, 'emotion' | 'emotionsFelt'>): string {
  const parts: string[] = []
  if (content.emotionsFelt?.length) parts.push(`chose ${content.emotionsFelt.map((e) => e.label).join(', ')}`)
  if (content.emotion.trim()) parts.push(`in their words: "${content.emotion.trim()}"`)
  return parts.join('; ') || 'not said'
}

/** Body for the prompts: where THEY placed each emotion, plus their own words. Never inferred. */
export function formatBody(content: Pick<MirrorContent, 'bodyResponse' | 'bodyPlacements'>): string {
  const parts: string[] = []
  if (content.bodyPlacements?.length) {
    const byEmotion = new Map<string, string[]>()
    for (const p of content.bodyPlacements) byEmotion.set(p.emotion, [...(byEmotion.get(p.emotion) ?? []), p.area])
    parts.push(`placed on the body map: ${[...byEmotion].map(([emotion, areas]) => `${emotion} in ${areas.join(', ')}`).join('; ')}`)
  }
  if (content.bodyResponse.trim()) parts.push(`in their words: "${content.bodyResponse.trim()}"`)
  return parts.join('; ') || 'not said'
}
