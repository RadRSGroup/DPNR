import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import { extractCandidateSignals } from '../twin-signals'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({ commitment: z.string().optional() })

/**
 * Added in Session 6 per explicit product request, for UX parity with
 * Decision Room's closing sequence. The real end of the whole Mirror Room
 * flow. `commitment` is genuinely optional, same as Decision Room's: an
 * empty/skipped commitment still finishes the flow, it just leaves the
 * field blank rather than appending anything. Unlike Decision Room (which
 * appends onto a separate outcome row), Mirror Room's content is one flat
 * item, so `commitment` is just its own field.
 *
 * As of Session 10, this step also fires the Digital Twin candidate-signal
 * extraction (`../twin-signals.ts`) — the one AI call this step makes, run
 * once at genuine session completion rather than per-step, per the spec's
 * "Not every chat turn updates the Digital Twin" trust rule.
 */
export const commitmentStep: StepDefinition = {
  allowedActions: ['SUBMIT_STEP'],
  handle: async (ctx) => {
    const { commitment } = parseValue(ctx.input, SubmitInput)
    const session = await getMirrorSession(ctx.pk, ctx.sessionId)
    const content = stubDecryptField<MirrorContent>(session.content)
    const now = new Date().toISOString()
    const updatedSession = {
      ...session,
      status: 'completed' as const,
      currentStepId: 'COMMITMENT',
      content: stubEncryptField<MirrorContent>({ ...content, commitment: commitment?.trim() ?? '' }),
      updatedAt: now,
    }
    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedSession }))

    const summary = [
      `Situation: ${content.situation}`,
      `Trigger: ${content.trigger}`,
      `Thought: ${content.thought}`,
      `Emotion: ${content.emotion}`,
      `Body response: ${content.bodyResponse}`,
      `Automatic reaction: ${content.automaticReaction}`,
      `Coping response: ${content.copingResponse}`,
      `Recurring pattern: ${content.recurringPattern}`,
      `Effect on energy/mood: ${content.energyMoodEffect}`,
      `Life domain: ${content.lifeDomain}`,
      commitment?.trim() ? `Commitment: ${commitment.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')
    // Awaited — see decision-steps/commitment.ts's identical note on why.
    await extractCandidateSignals(ctx.pk, ctx.sessionId, 'mirror_room', 'Mirror Room', summary)

    return { nextStepId: null, result: { commitment: commitment ?? null }, sessionComplete: true }
  },
}
