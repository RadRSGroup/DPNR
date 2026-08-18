import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { Sk, type MirrorSessionItem } from '@dpnr/shared-types'
import { HttpError } from '../../lib/http'
import { ddb, TABLE_NAME } from '../db'

/** All 10 fields from MirrorSessionItemSchema's content comment — see that file for the step-grouping rationale. */
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
}

export async function getMirrorSession(pk: string, mirrorId: string): Promise<MirrorSessionItem> {
  const result = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk, sk: Sk.mirrorRoom(mirrorId) } }))
  const item = result.Item as MirrorSessionItem | undefined
  if (!item) {
    throw new HttpError(404, 'mirror_session_not_found', 'No Mirror Room session exists for this id — submit SITUATION first.')
  }
  return item
}
