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
  // Mirror depth slice 2 (founder #30/#31, decided Session 78): optional
  // answers from the "go a little deeper" moments. Used ONLY in the
  // synthesis prompt (formatDepthContext) — never in the COMMITMENT summary
  // that feeds Twin extraction and the stored session summary.
  /** After Step 2; sent with the PATTERN submit. */
  emotionUnderneath?: string
  /** After Step 4; sent with the SYNTHESIS REFINE. */
  payoff?: string
  deeperBelief?: string
  /** User-led only, never prompted by the AI, never sent to Twin extraction. */
  origin?: string
  /** Sent with COMMITMENT; the person's own note, kept out of the Twin summary too. */
  support?: string
}

export type MirrorDepthField = 'emotionUnderneath' | 'payoff' | 'deeperBelief' | 'origin'

/**
 * Optional depth answers from a step's input: an absent key keeps what's
 * stored (older clients, a resume), a string sets it, and an empty string
 * clears it (undefined, so withAnswers treats "never answered" and "cleared"
 * alike and doesn't drop the synthesis for nothing).
 */
export function depthPatch<K extends MirrorDepthField>(
  input: Partial<Record<K, string>>,
  keys: readonly K[]
): Partial<Record<K, string | undefined>> {
  const patch: Partial<Record<K, string | undefined>> = {}
  for (const key of keys) {
    const value = input[key]
    if (typeof value === 'string') patch[key] = value.trim() || undefined
  }
  return patch
}

/**
 * The synthesis prompt's {{depthContext}}: the person's own words from the
 * depth moments, or a plain note that they didn't go deeper (templates have
 * no conditionals, so the caller always sends a line).
 */
export function formatDepthContext(content: MirrorContent): string {
  const lines = [
    content.emotionUnderneath ? `Something quieter underneath the feeling: "${content.emotionUnderneath}"` : null,
    content.payoff ? `What the reaction protected them from or gave them: "${content.payoff}"` : null,
    content.deeperBelief ? `What the moment seemed to say about them: "${content.deeperBelief}"` : null,
    content.origin ? `Something they chose to share about where this feels familiar from: "${content.origin}"` : null,
  ].filter(Boolean)
  return lines.length > 0 ? lines.join('\n') : 'They did not go deeper this time.'
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
// Session 77 (#33): the wording follows where the pattern came from, so the
// model is never told a pattern is "confirmed" when it isn't.
export function formatEntryContext(entry: MirrorEntry | undefined): string {
  if (entry?.mode === 'pattern' && (entry.patternName || entry.patternDescription)) {
    const label = entry.patternName ? `"${entry.patternName}"` : 'a pattern'
    const text = entry.patternDescription ? `"${entry.patternDescription}"` : ''
    switch (entry.patternSource) {
      case 'confirmed':
        return `They came in through a pattern they already know and have confirmed: ${label}${text ? ` (their own confirmed reading: ${text})` : ''}. Do not identify or name the pattern for them again; explore how it showed up in this specific moment.`
      case 'exploring':
        return `They chose to explore a pattern DPNR noticed earlier that they have not confirmed yet: ${label}${text ? ` (DPNR's earlier reading: ${text})` : ''}. Treat it as a possibility they are testing, not an established fact about them. Don't ask them to identify a pattern again; explore tentatively how it showed up in this moment, and leave room for it not to fit.`
      case 'reference':
        return `They picked ${label} from DPNR's general pattern list as possibly relevant${text ? ` (general description: ${text})` : ''}. It is a lens they chose, not something known or confirmed about them. Don't restart pattern identification; explore tentatively whether and how it showed up in this specific moment, and leave room for it not to fit.`
      default:
        // Sessions saved before Session 77: always the person's own Twin signal.
        return `They came in through a pattern from their own reflections: ${label}${text ? ` (the reading: ${text})` : ''}. Do not identify or name the pattern for them again; explore how it showed up in this specific moment.`
    }
  }
  if (entry?.mode === 'archetype' && entry.archetype) {
    return `They came in through trigger archetypes and felt the ${entry.archetype} part of them took over. Use this as context; do not restart generic pattern discovery.`
  }
  if (entry?.helpIdentify) {
    return 'They came in by describing a situation and said they are not sure what pattern is at play; they asked DPNR to help notice what may be happening. Begin from what happened and what became activated. Where what they shared supports it, you may name one possible pattern tentatively, as a question they can accept or reject (e.g. "People-Pleasing may be showing up here. Does that feel relevant?"), never as a label for who they are. If the evidence is thin, don\'t name one.'
  }
  return 'They came in by describing a situation. Begin from what happened and what became activated.'
}

// formatEmotion/formatBody moved to ../felt (shared with the Decision Room, Slice 5b).
export { formatEmotion, formatBody } from '../felt'
