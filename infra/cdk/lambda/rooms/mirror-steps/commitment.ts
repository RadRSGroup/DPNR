import { z } from 'zod'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { parseValue } from '../../lib/http'
import { stubEncryptField, stubDecryptField } from '../../lib/crypto-stub'
import { ddb, TABLE_NAME } from '../db'
import { getMirrorSession, type MirrorContent } from './helpers'
import type { StepDefinition } from '../types'

const SubmitInput = z.object({ commitment: z.string().optional() })

/**
 * Added in Session 6 per explicit product request, for UX parity with
 * Decision Room's closing sequence. The real end of the whole Mirror Room
 * flow — no AI call (matches Decision Room's own `commitmentStep`, which
 * also has none). `commitment` is genuinely optional, same as Decision
 * Room's: an empty/skipped commitment still finishes the flow, it just
 * leaves the field blank rather than appending anything. Unlike Decision
 * Room (which appends onto a separate outcome row), Mirror Room's content
 * is one flat item, so `commitment` is just its own field.
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
    return { nextStepId: null, result: { commitment: commitment ?? null }, sessionComplete: true }
  },
}
